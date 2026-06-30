/**
 * Distributed rate limiting.
 *
 * In production we use Upstash Redis (sliding window) so limits hold across all
 * serverless instances. When Upstash env vars are absent (e.g. local dev) we
 * fall back to a best-effort in-memory limiter and log a warning.
 */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError } from "./errorHandler";

interface LimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number; // epoch ms when the window resets
}

type Limiter = (id: string) => Promise<LimitResult>;

function buildLimiter(): Limiter {
  const perMinute = Number(process.env.RATE_LIMIT_PER_MINUTE) || 60;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const ratelimit = new Ratelimit({
      // Bounded retries so an Upstash hiccup can't add long latency to a request
      // (and so the fail-open path below kicks in quickly).
      redis: new Redis({ url, token, retry: { retries: 1, backoff: () => 0 } }),
      limiter: Ratelimit.slidingWindow(perMinute, "60 s"),
      prefix: "astraea",
    });
    return async (id) => {
      const r = await ratelimit.limit(id);
      return { success: r.success, limit: r.limit, remaining: r.remaining, resetMs: r.reset };
    };
  }

  // eslint-disable-next-line no-console
  console.warn(
    "[astraea] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory rate limiter (not shared across instances).",
  );
  const hits = new Map<string, { count: number; resetMs: number }>();
  return async (id) => {
    const now = Date.now();
    const entry = hits.get(id);
    if (!entry || now >= entry.resetMs) {
      const resetMs = now + 60_000;
      hits.set(id, { count: 1, resetMs });
      return { success: true, limit: perMinute, remaining: perMinute - 1, resetMs };
    }
    entry.count += 1;
    return {
      success: entry.count <= perMinute,
      limit: perMinute,
      remaining: Math.max(0, perMinute - entry.count),
      resetMs: entry.resetMs,
    };
  };
}

let limiter: Limiter | null = null;

function clientId(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim();
  return req.ip ?? "unknown";
}

export const rateLimit: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (!limiter) limiter = buildLimiter();

  let result;
  try {
    result = await limiter(clientId(req));
  } catch (err) {
    // Fail open: a rate-limiter outage or exhausted Upstash quota must never
    // break the API. Allow the request and log it for visibility.
    // eslint-disable-next-line no-console
    console.warn(`[astraea] rate limiter unavailable — allowing request: ${err instanceof Error ? err.message : err}`);
    next();
    return;
  }

  const { success, limit, remaining, resetMs } = result;
  res.setHeader("X-RateLimit-Limit", limit);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetMs / 1000));

  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
    res.setHeader("Retry-After", retryAfter);
    throw new ApiError(429, "RATE_LIMITED", `Rate limit exceeded. Try again in ${retryAfter}s.`);
  }
  next();
};
