import { beforeAll, describe, it, expect } from "vitest";

// Configure an unreachable Upstash so the limiter's call rejects → fail-open path.
beforeAll(() => {
  process.env.UPSTASH_REDIS_REST_URL = "http://127.0.0.1:1";
  process.env.UPSTASH_REDIS_REST_TOKEN = "unreachable";
});

describe("rate limiter — fail open", () => {
  it("allows the request when the limiter errors instead of 500-ing", async () => {
    const { createApp } = await import("../src/app");
    const request = (await import("supertest")).default;
    const app = createApp();

    const res = await request(app).get("/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("ok");
  });
});
