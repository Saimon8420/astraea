import { describe, it, expect } from "vitest";
import * as Astronomy from "astronomy-engine";
import { eclipticLongitude, bodyPosition } from "../src/lib/ephemeris";
import { computeAngles } from "../src/lib/angles";
import { signOf, degreeInSign } from "../src/lib/zodiac";

const DEG = Math.PI / 180;

describe("ephemeris — Sun longitude at cardinal points", () => {
  // The Sun's ecliptic longitude is ~0/90/180/270 at the equinoxes/solstices.
  it("≈0° (0° Aries) at the March 2026 equinox", () => {
    const lon = eclipticLongitude("Sun", new Date("2026-03-20T14:46:00Z"));
    expect(Math.min(lon, 360 - lon)).toBeLessThan(0.2);
    expect(signOf(lon)).toMatch(/Aries|Pisces/);
  });

  it("≈90° (0° Cancer) at the June 2026 solstice", () => {
    const lon = eclipticLongitude("Sun", new Date("2026-06-21T08:25:00Z"));
    expect(Math.abs(lon - 90)).toBeLessThan(0.2);
    expect(signOf(lon)).toMatch(/Gemini|Cancer/); // exactly on the boundary
  });
});

describe("ephemeris — speed & retrograde", () => {
  it("Moon moves ~12–14°/day, prograde", () => {
    const moon = bodyPosition("Moon", new Date("2026-06-21T00:00:00Z"));
    expect(moon.speed).toBeGreaterThan(11);
    expect(moon.speed).toBeLessThan(16);
    expect(moon.retrograde).toBe(false);
  });

  it("Sun is always prograde at ~1°/day", () => {
    const sun = bodyPosition("Sun", new Date("2026-06-21T00:00:00Z"));
    expect(sun.speed).toBeGreaterThan(0.9);
    expect(sun.speed).toBeLessThan(1.1);
    expect(sun.retrograde).toBe(false);
  });
});

/**
 * Rigorous angle check: convert the computed Ascendant/MC ecliptic points
 * (β = 0) back to horizontal coordinates using astronomy-engine itself.
 * The Ascendant must sit on the horizon (altitude ≈ 0) on the eastern side;
 * the MC must sit on the meridian (azimuth ≈ 0 or 180).
 */
function eclipticPointToHorizon(longitude: number, date: Date, lat: number, lon: number) {
  const time = Astronomy.MakeTime(date);
  const vEct = new Astronomy.Vector(Math.cos(longitude * DEG), Math.sin(longitude * DEG), 0, time);
  // Horizon() expects equator-OF-DATE (EQD) RA/Dec, not J2000 (EQJ).
  const vEqd = Astronomy.RotateVector(Astronomy.Rotation_ECT_EQD(time), vEct);
  const eq = Astronomy.EquatorFromVector(vEqd);
  return Astronomy.Horizon(time, new Astronomy.Observer(lat, lon, 0), eq.ra, eq.dec, "");
}

describe("angles — Ascendant on horizon, MC on meridian", () => {
  const cases = [
    { date: new Date("1990-01-15T12:30:00Z"), lat: 40.71, lon: -74.0 }, // New York
    { date: new Date("1985-07-20T03:10:00Z"), lat: 23.81, lon: 90.41 }, // Dhaka
    { date: new Date("2001-11-05T18:45:00Z"), lat: -33.87, lon: 151.21 }, // Sydney
  ];

  for (const c of cases) {
    it(`lat ${c.lat}, lon ${c.lon}`, () => {
      const a = computeAngles(c.date, c.lat, c.lon);

      const asc = eclipticPointToHorizon(a.ascendant, c.date, c.lat, c.lon);
      expect(Math.abs(asc.altitude)).toBeLessThan(0.05); // on the horizon
      expect(asc.azimuth).toBeGreaterThan(0); // eastern half
      expect(asc.azimuth).toBeLessThan(180);

      const mc = eclipticPointToHorizon(a.midheaven, c.date, c.lat, c.lon);
      const meridian = Math.min(mc.azimuth, Math.abs(mc.azimuth - 180), Math.abs(mc.azimuth - 360));
      expect(meridian).toBeLessThan(0.1); // on the meridian
      expect(mc.altitude).toBeGreaterThan(0); // upper meridian (visible)

      // Descendant/IC are the opposite points.
      expect(degreeInSign(a.descendant)).toBeCloseTo(degreeInSign(a.ascendant), 4);
    });
  }
});
