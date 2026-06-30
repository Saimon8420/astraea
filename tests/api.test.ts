import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

const PERSON_A = { date: "1990-01-15", time: "12:30", lat: 40.71, lng: -74.0 }; // New York
const PERSON_B = { date: "1988-08-10", time: "06:45", lat: 51.5, lng: -0.12 }; // London

describe("POST /v1/natal", () => {
  it("returns a full chart with bodies, angles, houses, aspects", async () => {
    const res = await request(app).post("/v1/natal").send(PERSON_A);
    expect(res.status).toBe(200);
    expect(res.body.data.bodies.sun.sign).toBe("Capricorn"); // mid-January Sun
    expect(res.body.data.bodies.sun.interpretation).toMatch(/identity/i);
    expect(res.body.data.angles.ascendant.sign).toBeTruthy();
    expect(res.body.data.houses.system).toBe("placidus");
    expect(res.body.data.houses.cusps).toHaveLength(12);
    expect(Array.isArray(res.body.data.aspects)).toBe(true);
    expect(res.body.data.points.partOfFortune).toBeTruthy();
    expect(res.body.meta.subject.location.timezone).toMatch(/New_York/);
  });

  it("honours an alternate house system", async () => {
    const res = await request(app).post("/v1/natal").send({ ...PERSON_A, houseSystem: "whole-sign" });
    expect(res.body.data.houses.system).toBe("whole-sign");
    expect(res.body.data.houses.cusps[0].degreeDecimal).toBeCloseTo(0, 4);
  });

  it("omits angles/houses and warns when birth time is unknown", async () => {
    const res = await request(app).post("/v1/natal").send({ date: "1990-01-15", lat: 40.71, lng: -74.0 });
    expect(res.status).toBe(200);
    expect(res.body.data.angles).toBeNull();
    expect(res.body.data.houses).toBeNull();
    expect(res.body.data.notes.join(" ")).toMatch(/birth time/i);
  });

  it("rejects out-of-range coordinates with 400", async () => {
    const res = await request(app).post("/v1/natal").send({ date: "1990-01-15", lat: 999, lng: 0 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a time without location/timezone", async () => {
    const res = await request(app).post("/v1/natal").send({ date: "1990-01-15", time: "12:30" });
    expect(res.status).toBe(400);
  });

  it("ignores empty-string optional fields (Scalar autofill)", async () => {
    const res = await request(app)
      .post("/v1/natal")
      .send({ ...PERSON_A, tz: "", orb: "" });
    expect(res.status).toBe(200);
  });

  it("rejects an invalid timezone with 400 (not a 500 crash)", async () => {
    const res = await request(app).post("/v1/natal").send({ ...PERSON_A, tz: "Not/AZone" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects an out-of-range birth year with 400", async () => {
    const res = await request(app).post("/v1/natal").send({ date: "0095-01-01", lat: 0, lng: 0 });
    expect(res.status).toBe(400);
  });

  it("returns 400 (not 500) for malformed JSON", async () => {
    const res = await request(app)
      .post("/v1/natal")
      .set("content-type", "application/json")
      .send('{"date":"1990-01-15", oops}');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });
});

describe("GET /v1/positions", () => {
  it("returns all ten bodies for a date", async () => {
    const res = await request(app).get("/v1/positions?date=2026-06-21&time=12:00");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.bodies)).toHaveLength(10);
    expect(res.body.data.bodies.sun.sign).toBe("Cancer");
  });
});

describe("POST /v1/transits", () => {
  it("compares transiting sky to a natal chart", async () => {
    const res = await request(app).post("/v1/transits").send({ natal: PERSON_A, transitDate: "2026-06-30" });
    expect(res.status).toBe(200);
    expect(res.body.data.natal.bodies.sun.sign).toBe("Capricorn");
    expect(Object.keys(res.body.data.transit.bodies)).toHaveLength(10);
    expect(Array.isArray(res.body.data.aspects)).toBe(true);
  });
});

describe("POST /v1/synastry", () => {
  it("returns inter-aspects between two charts", async () => {
    const res = await request(app).post("/v1/synastry").send({ personA: PERSON_A, personB: PERSON_B });
    expect(res.status).toBe(200);
    expect(res.body.data.personA.bodies.sun.sign).toBe("Capricorn");
    expect(res.body.data.personB.bodies.sun.sign).toBe("Leo");
    expect(Array.isArray(res.body.data.interAspects)).toBe(true);
  });
});

describe("POST /v1/composite", () => {
  it("returns a midpoint chart", async () => {
    const res = await request(app).post("/v1/composite").send({ personA: PERSON_A, personB: PERSON_B });
    expect(res.status).toBe(200);
    expect(res.body.data.method).toMatch(/midpoint/i);
    expect(Object.keys(res.body.data.bodies)).toHaveLength(10);
    expect(res.body.data.angles).toBeTruthy();
  });
});

describe("POST /v1/solar-return", () => {
  it("returns the chart for the Sun's return that year", async () => {
    const res = await request(app).post("/v1/solar-return").send({ natal: PERSON_A, year: 2026 });
    expect(res.status).toBe(200);
    // The return Sun is at the natal Sun longitude → same sign.
    expect(res.body.data.bodies.sun.sign).toBe("Capricorn");
    expect(res.body.meta.solarReturn.instantUtc).toContain("2026-01");
  });
});

describe("GET /v1/horoscope", () => {
  it("returns a daily reading for a sign", async () => {
    const res = await request(app).get("/v1/horoscope?sign=aries&date=2026-06-30");
    expect(res.status).toBe(200);
    expect(res.body.data.sign.sign).toBe("Aries");
    expect(res.body.data.moon.sign).toBeTruthy();
    expect(res.body.data.message.length).toBeGreaterThan(20);
  });

  it("rejects an unknown sign", async () => {
    const res = await request(app).get("/v1/horoscope?sign=ophiuchus");
    expect(res.status).toBe(400);
  });
});

describe("GET /v1/reference", () => {
  it("lists all signs", async () => {
    const res = await request(app).get("/v1/reference/signs");
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(12);
  });

  it("returns one sign, planet and aspect", async () => {
    expect((await request(app).get("/v1/reference/signs/aries")).body.data.element).toBe("Fire");
    expect((await request(app).get("/v1/reference/planets/mars")).body.data.keyword).toBe("drive");
    expect((await request(app).get("/v1/reference/aspects/trine")).body.data.angle).toBe(120);
  });

  it("404s an unknown reference", async () => {
    const res = await request(app).get("/v1/reference/signs/nope");
    expect(res.status).toBe(404);
  });
});

describe("Meta + docs + errors", () => {
  it("health is ok", async () => {
    expect((await request(app).get("/v1/health")).body.data.status).toBe("ok");
  });

  it("serves the OpenAPI spec", async () => {
    const res = await request(app).get("/openapi.json");
    expect(res.body.openapi).toBe("3.1.0");
    expect(Object.keys(res.body.paths).length).toBeGreaterThan(7);
  });

  it("serves the static docs page at /", async () => {
    const res = await request(app).get("/");
    expect(res.headers["content-type"]).toMatch(/html/);
    expect(res.text).toMatch(/api-reference/);
  });

  it("404s unknown endpoints", async () => {
    const res = await request(app).get("/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });
});
