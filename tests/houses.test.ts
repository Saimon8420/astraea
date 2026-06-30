import { describe, it, expect } from "vitest";
import { computeHouses, houseOf, raFromLongitude } from "../src/lib/houses";
import { norm360 } from "../src/lib/zodiac";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const DATE = new Date("1990-01-15T12:30:00Z");
const LAT = 40.71;
const LON = -74.0; // New York

describe("houses — Placidus", () => {
  const h = computeHouses(DATE, LAT, LON, "placidus");

  it("anchors house 1 = Asc and house 10 = MC", () => {
    expect(h.system).toBe("placidus");
    expect(h.cusps[0]).toBeCloseTo(h.angles.ascendant, 6);
    expect(h.cusps[9]).toBeCloseTo(h.angles.midheaven, 6);
    expect(h.cusps[6]).toBeCloseTo(norm360(h.angles.ascendant + 180), 6);
    expect(h.cusps[3]).toBeCloseTo(norm360(h.angles.midheaven + 180), 6);
  });

  it("cusps advance monotonically around the circle", () => {
    let total = 0;
    for (let i = 0; i < 12; i += 1) {
      const span = norm360(h.cusps[(i + 1) % 12] - h.cusps[i]);
      expect(span).toBeGreaterThan(0);
      expect(span).toBeLessThan(180);
      total += span;
    }
    expect(total).toBeCloseTo(360, 4);
  });

  it("intermediate cusps satisfy the Placidus semi-arc condition", () => {
    const eps = h.angles.obliquity;
    const ramc = h.angles.ramc;
    // [house index (0-based), kDSA, kNSA]
    const checks: Array<[number, number, number]> = [
      [10, 1 / 3, 0], // house 11
      [11, 2 / 3, 0], // house 12
      [1, 1, 1 / 3], // house 2
      [2, 1, 2 / 3], // house 3
    ];
    for (const [idx, kDSA, kNSA] of checks) {
      const lon = h.cusps[idx];
      const ra = raFromLongitude(lon, eps);
      const md = norm360(ra - ramc);
      const delta = Math.asin(Math.sin(eps * DEG) * Math.sin(lon * DEG));
      const ad = Math.asin(Math.tan(LAT * DEG) * Math.tan(delta)) * RAD;
      const expected = kDSA * (90 + ad) + kNSA * (90 - ad);
      expect(md).toBeCloseTo(expected, 3);
    }
  });
});

describe("houses — Whole-Sign & Equal", () => {
  it("Whole-Sign: house 1 starts at 0° of the Ascendant's sign; cusps 30° apart", () => {
    const h = computeHouses(DATE, LAT, LON, "whole-sign");
    expect(h.cusps[0] % 30).toBeCloseTo(0, 6);
    expect(Math.floor(h.cusps[0] / 30)).toBe(Math.floor(h.angles.ascendant / 30));
    for (let i = 0; i < 12; i += 1) {
      expect(norm360(h.cusps[(i + 1) % 12] - h.cusps[i])).toBeCloseTo(30, 6);
    }
  });

  it("Equal: house 1 = Asc exactly; cusps 30° apart", () => {
    const h = computeHouses(DATE, LAT, LON, "equal");
    expect(h.cusps[0]).toBeCloseTo(h.angles.ascendant, 6);
    expect(norm360(h.cusps[1] - h.cusps[0])).toBeCloseTo(30, 6);
  });
});

describe("houses — polar fallback & houseOf", () => {
  it("falls back to Whole-Sign above the polar circle", () => {
    const h = computeHouses(new Date("2000-06-21T00:00:00Z"), 78, 15, "placidus");
    expect(h.system).toBe("whole-sign");
    expect(h.note).toMatch(/polar/i);
  });

  it("houseOf places a longitude just past a cusp into that house", () => {
    const h = computeHouses(DATE, LAT, LON, "placidus");
    expect(houseOf(norm360(h.cusps[0] + 0.5), h.cusps)).toBe(1);
    expect(houseOf(norm360(h.cusps[4] + 0.5), h.cusps)).toBe(5);
  });
});
