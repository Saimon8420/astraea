/**
 * Zodiac primitives — signs, degree formatting, and essential dignities.
 *
 * Tropical zodiac: ecliptic longitude 0° = 0° Aries, advancing 30° per sign.
 * Everything here is pure math on a longitude in [0, 360).
 */

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export type Sign = (typeof SIGNS)[number];

export const ELEMENTS: Record<Sign, "Fire" | "Earth" | "Air" | "Water"> = {
  Aries: "Fire",
  Taurus: "Earth",
  Gemini: "Air",
  Cancer: "Water",
  Leo: "Fire",
  Virgo: "Earth",
  Libra: "Air",
  Scorpio: "Water",
  Sagittarius: "Fire",
  Capricorn: "Earth",
  Aquarius: "Air",
  Pisces: "Water",
};

export const MODALITIES: Record<Sign, "Cardinal" | "Fixed" | "Mutable"> = {
  Aries: "Cardinal",
  Taurus: "Fixed",
  Gemini: "Mutable",
  Cancer: "Cardinal",
  Leo: "Fixed",
  Virgo: "Mutable",
  Libra: "Cardinal",
  Scorpio: "Fixed",
  Sagittarius: "Mutable",
  Capricorn: "Cardinal",
  Aquarius: "Fixed",
  Pisces: "Mutable",
};

/** Modern rulerships (used for the "ruler" reference of each sign). */
export const SIGN_RULERS: Record<Sign, string> = {
  Aries: "Mars",
  Taurus: "Venus",
  Gemini: "Mercury",
  Cancer: "Moon",
  Leo: "Sun",
  Virgo: "Mercury",
  Libra: "Venus",
  Scorpio: "Pluto",
  Sagittarius: "Jupiter",
  Capricorn: "Saturn",
  Aquarius: "Uranus",
  Pisces: "Neptune",
};

/** Wrap any angle into [0, 360). */
export function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/** Smallest signed difference a − b, wrapped to (−180, 180]. */
export function signedDelta(a: number, b: number): number {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

export function signIndex(longitude: number): number {
  return Math.floor(norm360(longitude) / 30);
}

export function signOf(longitude: number): Sign {
  return SIGNS[signIndex(longitude)];
}

/** Degrees within the current sign, [0, 30). */
export function degreeInSign(longitude: number): number {
  return norm360(longitude) - signIndex(longitude) * 30;
}

/** Format an in-sign degree as DD°MM'SS". */
export function formatDMS(degreeInSign: number): string {
  let d = Math.floor(degreeInSign);
  let m = Math.floor((degreeInSign - d) * 60);
  let s = Math.round((((degreeInSign - d) * 60) - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }
  return `${String(d).padStart(2, "0")}°${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
}

/** A longitude expressed in the public position shape. */
export interface SignPosition {
  longitude: number; // absolute ecliptic longitude, [0, 360)
  sign: Sign;
  degree: string; // DD°MM'SS" within the sign
  degreeDecimal: number; // decimal degrees within the sign
}

export function toSignPosition(longitude: number): SignPosition {
  const lon = norm360(longitude);
  const dis = degreeInSign(lon);
  return {
    longitude: Number(lon.toFixed(6)),
    sign: signOf(lon),
    degree: formatDMS(dis),
    degreeDecimal: Number(dis.toFixed(4)),
  };
}

// --- Essential dignities (traditional) -------------------------------------

const RULERSHIP: Record<string, Sign[]> = {
  Sun: ["Leo"],
  Moon: ["Cancer"],
  Mercury: ["Gemini", "Virgo"],
  Venus: ["Taurus", "Libra"],
  Mars: ["Aries", "Scorpio"],
  Jupiter: ["Sagittarius", "Pisces"],
  Saturn: ["Capricorn", "Aquarius"],
  Uranus: ["Aquarius"],
  Neptune: ["Pisces"],
  Pluto: ["Scorpio"],
};

const EXALTATION: Record<string, Sign> = {
  Sun: "Aries",
  Moon: "Taurus",
  Mercury: "Virgo",
  Venus: "Pisces",
  Mars: "Capricorn",
  Jupiter: "Cancer",
  Saturn: "Libra",
};

const OPPOSITE: Record<Sign, Sign> = SIGNS.reduce(
  (acc, s, i) => {
    acc[s] = SIGNS[(i + 6) % 12];
    return acc;
  },
  {} as Record<Sign, Sign>,
);

export type Dignity = "domicile" | "exaltation" | "detriment" | "fall" | null;

/** Essential dignity of a planet placed in a sign (null = peregrine). */
export function dignityOf(planet: string, sign: Sign): Dignity {
  const homes = RULERSHIP[planet];
  if (!homes) return null;
  if (homes.includes(sign)) return "domicile";
  if (EXALTATION[planet] === sign) return "exaltation";
  if (homes.some((h) => OPPOSITE[h] === sign)) return "detriment";
  if (EXALTATION[planet] && OPPOSITE[EXALTATION[planet]] === sign) return "fall";
  return null;
}
