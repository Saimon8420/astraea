/**
 * Ephemeris — geocentric, apparent ecliptic longitudes (of date) for the
 * classic ten bodies, plus daily speed and retrograde state.
 *
 * Tropical astrology uses the ecliptic longitude referred to the true equinox
 * of date, which is exactly what `astronomy-engine` produces here:
 *   - Sun:    SunPosition().elon          (apparent geocentric, of date)
 *   - Moon:   EclipticGeoMoon().lon       (ECT, of date)
 *   - Planet: GeoVector (EQJ) → rotate to ECT → atan2(y, x)
 *
 * IMPORTANT (mirrors the SunCalc gotcha in Horizon): `EclipticLongitude()` is
 * *heliocentric* — wrong for astrology. We never use it.
 */

import * as Astronomy from "astronomy-engine";
import { norm360, signedDelta } from "./zodiac";

export const PLANETS = [
  "Sun",
  "Moon",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
] as const;

export type Planet = (typeof PLANETS)[number];

const BODY: Record<Planet, Astronomy.Body> = {
  Sun: Astronomy.Body.Sun,
  Moon: Astronomy.Body.Moon,
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
  Uranus: Astronomy.Body.Uranus,
  Neptune: Astronomy.Body.Neptune,
  Pluto: Astronomy.Body.Pluto,
};

const AU_KM = 149597870.7;

/** Geocentric apparent ecliptic longitude of date, in [0, 360). */
export function eclipticLongitude(planet: Planet, date: Date): number {
  if (planet === "Sun") return norm360(Astronomy.SunPosition(date).elon);
  if (planet === "Moon") return norm360(Astronomy.EclipticGeoMoon(date).lon);

  const eqj = Astronomy.GeoVector(BODY[planet], date, true); // apparent (aberration on)
  const ect = Astronomy.RotateVector(Astronomy.Rotation_EQJ_ECT(date), eqj);
  return norm360((Math.atan2(ect.y, ect.x) * 180) / Math.PI);
}

/** Geocentric distance in km. */
export function distanceKm(planet: Planet, date: Date): number {
  if (planet === "Sun") return Astronomy.SunPosition(date).vec.Length() * AU_KM;
  if (planet === "Moon") return Astronomy.EclipticGeoMoon(date).dist * AU_KM;
  return Astronomy.GeoVector(BODY[planet], date, true).Length() * AU_KM;
}

export interface BodyPosition {
  name: Planet;
  longitude: number; // [0, 360)
  speed: number; // ecliptic °/day (negative = retrograde)
  retrograde: boolean;
  distanceKm: number;
}

const DAY_MS = 86400000;

/** Full position of one body, with central-difference daily speed. */
export function bodyPosition(planet: Planet, date: Date): BodyPosition {
  const lon = eclipticLongitude(planet, date);
  // Central difference over ±6h for a stable instantaneous rate.
  const dtDays = 0.25;
  const before = eclipticLongitude(planet, new Date(date.getTime() - dtDays * DAY_MS));
  const after = eclipticLongitude(planet, new Date(date.getTime() + dtDays * DAY_MS));
  const speed = signedDelta(after, before) / (2 * dtDays);
  return {
    name: planet,
    longitude: lon,
    speed: Number(speed.toFixed(4)),
    retrograde: speed < 0,
    distanceKm: Math.round(distanceKm(planet, date)),
  };
}

/** All ten bodies at an instant. */
export function allBodies(date: Date): BodyPosition[] {
  return PLANETS.map((p) => bodyPosition(p, date));
}
