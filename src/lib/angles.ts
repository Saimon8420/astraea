/**
 * Chart angles — Ascendant, Midheaven (MC), and the obliquity / sidereal-time
 * machinery the house systems also need.
 *
 * Conventions: longitudes in degrees [0, 360); latitude φ north-positive;
 * longitude east-positive. RAMC = right ascension of the meridian = local
 * apparent sidereal time expressed in degrees.
 */

import * as Astronomy from "astronomy-engine";
import { norm360 } from "./zodiac";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

/** Mean obliquity of the ecliptic (of date), in degrees. */
export function obliquity(date: Date): number {
  const jd = date.getTime() / 86400000 + 2440587.5;
  const T = (jd - 2451545.0) / 36525;
  return 23.439291111 - 0.0130041667 * T - 1.6389e-7 * T * T + 5.036e-7 * T * T * T;
}

/** Right ascension of the meridian (RAMC) in degrees, for a longitude (east+). */
export function ramcDegrees(date: Date, longitudeEast: number): number {
  const gastHours = Astronomy.SiderealTime(date); // Greenwich apparent sidereal time
  const lstHours = gastHours + longitudeEast / 15;
  return norm360(lstHours * 15);
}

export interface Angles {
  ascendant: number;
  midheaven: number; // MC
  descendant: number;
  imumCoeli: number; // IC
  ramc: number;
  obliquity: number;
}

/** Compute the four chart angles for a moment + geographic location. */
export function computeAngles(date: Date, latitude: number, longitudeEast: number): Angles {
  const eps = obliquity(date);
  const ramc = ramcDegrees(date, longitudeEast);

  const ramcR = ramc * DEG;
  const epsR = eps * DEG;
  const latR = latitude * DEG;

  // Midheaven: ecliptic point on the meridian (same quadrant as RAMC).
  const mc = norm360(Math.atan2(Math.sin(ramcR), Math.cos(ramcR) * Math.cos(epsR)) * RAD);

  // Ascendant: ecliptic point rising on the eastern horizon.
  let asc = norm360(
    Math.atan2(
      Math.cos(ramcR),
      -(Math.sin(ramcR) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR)),
    ) * RAD,
  );

  // Quadrant guard: the Ascendant must lie in the rising semicircle east of the
  // MC, i.e. (asc − mc) mod 360 ∈ (0, 180). Flip by 180° otherwise.
  if (norm360(asc - mc) > 180) asc = norm360(asc + 180);

  return {
    ascendant: asc,
    midheaven: mc,
    descendant: norm360(asc + 180),
    imumCoeli: norm360(mc + 180),
    ramc,
    obliquity: eps,
  };
}
