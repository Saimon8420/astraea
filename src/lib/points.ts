/**
 * Derived chart points that aren't direct bodies:
 *   - Mean Lunar Nodes (North/South) — Meeus polynomial for the mean ascending node.
 *   - Lilith (Mean Black Moon) — the mean lunar apogee.
 *   - Part of Fortune — the Arabic lot, sect-aware (day vs night formula).
 *
 * "Mean" node/Lilith are the values most Western astrologers use by default;
 * the true (osculating) variants oscillate ±~1.5° and are a v2 option.
 */

import { norm360 } from "./zodiac";

function julianCenturies(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  return (jd - 2451545.0) / 36525;
}

/** Mean longitude of the Moon's ascending node (Meeus, deg). Retrograde. */
export function meanNorthNode(date: Date): number {
  const T = julianCenturies(date);
  const omega =
    125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + (T * T * T) / 467441 - (T * T * T * T) / 60616000;
  return norm360(omega);
}

export function meanSouthNode(date: Date): number {
  return norm360(meanNorthNode(date) + 180);
}

/** Mean Black Moon Lilith = mean lunar apogee = mean perigee + 180° (Meeus, deg). */
export function meanLilith(date: Date): number {
  const T = julianCenturies(date);
  const Lp =
    218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + (T * T * T) / 538841 - (T * T * T * T) / 65194000;
  const Mprime =
    134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + (T * T * T) / 69699 - (T * T * T * T) / 14712000;
  const perigee = Lp - Mprime;
  return norm360(perigee + 180);
}

/**
 * Part of Fortune. Sect-aware: by day PoF = Asc + Moon − Sun; by night the Moon
 * and Sun swap. `isDayChart` should be true when the Sun is above the horizon.
 */
export function partOfFortune(asc: number, sun: number, moon: number, isDayChart: boolean): number {
  return isDayChart ? norm360(asc + moon - sun) : norm360(asc + sun - moon);
}
