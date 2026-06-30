/**
 * House systems — Placidus (default), Whole-Sign, and Equal.
 *
 * Returns the 12 house cusps as ecliptic longitudes. Placidus uses the classic
 * iterative semi-arc method; it is undefined inside the polar circles, in which
 * case `computeHouses` reports it so the caller can fall back to Whole-Sign.
 */

import { norm360, signIndex } from "./zodiac";
import { computeAngles, type Angles } from "./angles";

export type HouseSystem = "placidus" | "whole-sign" | "equal";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export interface Houses {
  system: HouseSystem;
  cusps: number[]; // length 12, index 0 = house 1
  angles: Angles;
  note?: string;
}

/** Right ascension (deg) of an ecliptic point with latitude 0. */
function raFromLongitude(lonDeg: number, epsDeg: number): number {
  const lon = lonDeg * DEG;
  const eps = epsDeg * DEG;
  return norm360(Math.atan2(Math.sin(lon) * Math.cos(eps), Math.cos(lon)) * RAD);
}

/**
 * One Placidus intermediate cusp via fixed-point iteration.
 * MD(δ) = kDSA·(90+AD) + kNSA·(90−AD), AD = ascensional difference.
 * Returns null if the point is circumpolar (Placidus undefined).
 */
function placidusCusp(
  ramc: number,
  latDeg: number,
  epsDeg: number,
  offset: number,
  kDSA: number,
  kNSA: number,
): number | null {
  const eps = epsDeg * DEG;
  const lat = latDeg * DEG;
  let lambda = norm360(ramc + offset);

  for (let i = 0; i < 25; i += 1) {
    const delta = Math.asin(Math.sin(eps) * Math.sin(lambda * DEG));
    const adArg = Math.tan(lat) * Math.tan(delta);
    if (adArg < -1 || adArg > 1) return null; // circumpolar → undefined
    const adDeg = Math.asin(adArg) * RAD;
    const md = kDSA * (90 + adDeg) + kNSA * (90 - adDeg);
    const raC = norm360(ramc + md);
    const next = norm360(Math.atan2(Math.sin(raC * DEG), Math.cos(raC * DEG) * Math.cos(eps)) * RAD);
    if (Math.abs(norm360(next - lambda + 180) - 180) < 1e-9) {
      lambda = next;
      break;
    }
    lambda = next;
  }
  return lambda;
}

function placidusCusps(angles: Angles, latDeg: number): number[] | null {
  const { ramc, obliquity: eps, ascendant: asc, midheaven: mc } = angles;
  const c11 = placidusCusp(ramc, latDeg, eps, 30, 1 / 3, 0);
  const c12 = placidusCusp(ramc, latDeg, eps, 60, 2 / 3, 0);
  const c2 = placidusCusp(ramc, latDeg, eps, 120, 1, 1 / 3);
  const c3 = placidusCusp(ramc, latDeg, eps, 150, 1, 2 / 3);
  if (c11 === null || c12 === null || c2 === null || c3 === null) return null;

  // House 1 = Asc, 10 = MC; opposite cusps are 180° apart.
  return [
    asc, // 1
    c2, // 2
    c3, // 3
    norm360(mc + 180), // 4 (IC)
    norm360(c11 + 180), // 5
    norm360(c12 + 180), // 6
    norm360(asc + 180), // 7 (Desc)
    norm360(c2 + 180), // 8
    norm360(c3 + 180), // 9
    mc, // 10
    c11, // 11
    c12, // 12
  ];
}

function equalCusps(asc: number): number[] {
  return Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30));
}

function wholeSignCusps(asc: number): number[] {
  const start = signIndex(asc) * 30;
  return Array.from({ length: 12 }, (_, i) => norm360(start + i * 30));
}

export function computeHouses(
  date: Date,
  latitude: number,
  longitudeEast: number,
  system: HouseSystem,
): Houses {
  const angles = computeAngles(date, latitude, longitudeEast);

  if (system === "equal") return { system, cusps: equalCusps(angles.ascendant), angles };
  if (system === "whole-sign") return { system, cusps: wholeSignCusps(angles.ascendant), angles };

  // Placidus
  const cusps = placidusCusps(angles, latitude);
  if (cusps) return { system: "placidus", cusps, angles };

  // Fallback: Placidus is undefined above the polar circle.
  return {
    system: "whole-sign",
    cusps: wholeSignCusps(angles.ascendant),
    angles,
    note: "Placidus is undefined at this latitude (polar region); fell back to Whole-Sign houses.",
  };
}

/** House number (1–12) containing an ecliptic longitude, given the cusps. */
export function houseOf(longitude: number, cusps: number[]): number {
  const lon = norm360(longitude);
  for (let i = 0; i < 12; i += 1) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    const within = norm360(lon - start);
    if (within < span) return i + 1;
  }
  return 12;
}

export { raFromLongitude };
