import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

// Isolated module registry → the limiter builds fresh and picks up this low limit.
beforeAll(() => {
  process.env.RATE_LIMIT_PER_MINUTE = "3";
});

describe("rate limiting", () => {
  it("returns 429 once the per-minute limit is exceeded", async () => {
    const app = createApp();
    const url = "/v1/positions?date=2026-06-21";

    const statuses: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      statuses.push((await request(app).get(url)).status);
    }

    expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
    expect(statuses).toContain(429);

    const limited = await request(app).get(url);
    expect(limited.status).toBe(429);
    expect(limited.body.error.code).toBe("RATE_LIMITED");
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});
