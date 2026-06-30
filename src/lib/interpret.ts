/**
 * Interpretation layer.
 *
 * Original, deterministic interpretations built by combining structured phrase
 * data (planet function × sign style × house area × aspect dynamic). This gives
 * complete coverage of every combination without thousands of bespoke strings,
 * and is fully reproducible. All content is original to Astraea.
 */

import type { Sign } from "./zodiac";
import { SIGNS, ELEMENTS, MODALITIES, SIGN_RULERS } from "./zodiac";
import type { Chart } from "./chart";
import type { Dignity } from "./zodiac";

interface PlanetMeaning {
  fn: string; // "Your core identity, ego and vitality"
  keyword: string;
}

export const PLANET_MEANING: Record<string, PlanetMeaning> = {
  Sun: { fn: "Your core identity, ego and vitality", keyword: "identity" },
  Moon: { fn: "Your emotional nature, instincts and inner needs", keyword: "emotion" },
  Mercury: { fn: "How you think, learn and communicate", keyword: "mind" },
  Venus: { fn: "How you love, relate and find pleasure", keyword: "love & values" },
  Mars: { fn: "How you assert yourself, act and pursue desire", keyword: "drive" },
  Jupiter: { fn: "Where you grow, expand and find opportunity", keyword: "expansion" },
  Saturn: { fn: "Where you meet discipline, limits and responsibility", keyword: "structure" },
  Uranus: { fn: "Where you seek freedom, change and innovation", keyword: "awakening" },
  Neptune: { fn: "Where you dream, imagine and dissolve boundaries", keyword: "imagination" },
  Pluto: { fn: "Where you transform, empower and confront the depths", keyword: "transformation" },
  "North Node": { fn: "Your karmic direction and growth edge", keyword: "destiny" },
  "South Node": { fn: "Your innate gifts and the comfort zone to move beyond", keyword: "past" },
  Lilith: { fn: "Your raw, untamed and instinctual self", keyword: "shadow" },
  "Part of Fortune": { fn: "Where ease, joy and worldly fortune flow", keyword: "fortune" },
};

interface SignMeaning {
  style: string;
  keywords: string[];
}

export const SIGN_MEANING: Record<Sign, SignMeaning> = {
  Aries: { style: "boldly and directly, eager to initiate", keywords: ["assertive", "pioneering", "energetic", "impulsive"] },
  Taurus: { style: "steadily and sensually, seeking stability", keywords: ["patient", "grounded", "loyal", "stubborn"] },
  Gemini: { style: "curiously and adaptably, through ideas and words", keywords: ["versatile", "communicative", "witty", "restless"] },
  Cancer: { style: "protectively and intuitively, guided by feeling", keywords: ["nurturing", "sensitive", "loyal", "moody"] },
  Leo: { style: "proudly and warmly, with creative flair", keywords: ["confident", "generous", "expressive", "proud"] },
  Virgo: { style: "precisely and practically, refining the details", keywords: ["analytical", "helpful", "meticulous", "critical"] },
  Libra: { style: "diplomatically and gracefully, seeking balance", keywords: ["harmonious", "fair", "charming", "indecisive"] },
  Scorpio: { style: "intensely and privately, probing beneath the surface", keywords: ["passionate", "perceptive", "determined", "secretive"] },
  Sagittarius: { style: "freely and optimistically, chasing meaning", keywords: ["adventurous", "philosophical", "candid", "restless"] },
  Capricorn: { style: "ambitiously and responsibly, building for the long run", keywords: ["disciplined", "ambitious", "prudent", "reserved"] },
  Aquarius: { style: "independently and inventively, for the collective", keywords: ["original", "humanitarian", "detached", "rebellious"] },
  Pisces: { style: "compassionately and imaginatively, dissolving boundaries", keywords: ["empathetic", "artistic", "dreamy", "escapist"] },
};

export const HOUSE_MEANING: Record<number, { area: string; keyword: string }> = {
  1: { area: "self, identity, body and how you appear to others", keyword: "self" },
  2: { area: "money, possessions, values and self-worth", keyword: "resources" },
  3: { area: "communication, learning, siblings and local life", keyword: "communication" },
  4: { area: "home, family, roots and emotional foundations", keyword: "home" },
  5: { area: "creativity, romance, play and children", keyword: "creativity" },
  6: { area: "work, health, routines and service", keyword: "work & health" },
  7: { area: "partnership, marriage and one-to-one relationships", keyword: "partnership" },
  8: { area: "intimacy, shared resources, transformation and the hidden", keyword: "depth" },
  9: { area: "philosophy, travel, higher learning and meaning", keyword: "horizons" },
  10: { area: "career, reputation, authority and public life", keyword: "career" },
  11: { area: "friendships, groups, hopes and the future", keyword: "community" },
  12: { area: "the unconscious, solitude, spirituality and what is hidden", keyword: "the unseen" },
};

export const ASPECT_MEANING: Record<string, { phrase: string; tone: string }> = {
  conjunction: { phrase: "fuses with", tone: "blending their energies into a single, concentrated focus" },
  sextile: { phrase: "harmonizes with", tone: "offering easy opportunity and cooperation when you act on it" },
  square: { phrase: "challenges", tone: "creating dynamic tension that drives growth through friction" },
  trine: { phrase: "flows with", tone: "bringing natural talent and effortless harmony" },
  opposition: { phrase: "opposes", tone: "demanding balance between two forces that pull in opposite directions" },
  semisextile: { phrase: "mildly stimulates", tone: "a subtle, low-key link that asks for small adjustments" },
  semisquare: { phrase: "frets against", tone: "a minor friction that nags for fine-tuning" },
  sesquiquadrate: { phrase: "agitates", tone: "a recurring tension that seeks release" },
  quincunx: { phrase: "awkwardly adjusts to", tone: "requiring constant recalibration between mismatched energies" },
};

const DIGNITY_NOTE: Record<Exclude<Dignity, null>, string> = {
  domicile: "at home and strongly expressed",
  exaltation: "elevated and operating at its best",
  detriment: "out of its comfort zone and working harder",
  fall: "weakened and tested here",
};

const ORDINALS = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];

export function planetInSign(planet: string, sign: Sign, dignity: Dignity = null): string {
  const p = PLANET_MEANING[planet];
  if (!p) return "";
  const base = `${p.fn} expresses ${SIGN_MEANING[sign].style}.`;
  if (dignity) return `${base} ${planet} is in ${dignity} in ${sign} — ${DIGNITY_NOTE[dignity]}.`;
  return base;
}

export function planetInHouse(planet: string, house: number): string {
  const p = PLANET_MEANING[planet];
  if (!p || !HOUSE_MEANING[house]) return "";
  return `In the ${ORDINALS[house]} house, this is channeled into ${HOUSE_MEANING[house].area}.`;
}

export function ascendantText(sign: Sign): string {
  const m = SIGN_MEANING[sign];
  return `With ${sign} rising, you approach the world ${m.style}. Others first encounter your ${m.keywords[0]}, ${m.keywords[1]} side.`;
}

export function midheavenText(sign: Sign): string {
  return `Midheaven in ${sign}: your public role and ambitions take on a ${SIGN_MEANING[sign].keywords[0]}, ${SIGN_MEANING[sign].keywords[1]} character.`;
}

export function aspectText(a: string, b: string, type: string): string {
  const m = ASPECT_MEANING[type];
  if (!m) return "";
  return `${a} ${m.phrase} ${b}, ${m.tone}.`;
}

export function signBasics(sign: Sign) {
  const m = SIGN_MEANING[sign];
  return {
    sign,
    element: ELEMENTS[sign],
    modality: MODALITIES[sign],
    ruler: SIGN_RULERS[sign],
    keywords: m.keywords,
    summary: `${sign} approaches life ${m.style}.`,
  };
}

/** Annotate a computed chart with interpretation text. */
export function interpretChart(chart: Chart): {
  bodies: Record<string, string>;
  points: Record<string, string>;
  angles?: Record<string, string>;
  aspects: string[];
} {
  const bodies: Record<string, string> = {};
  for (const b of chart.bodies) {
    const sign = planetInSign(b.name, b.sign, b.dignity);
    const house = b.house ? ` ${planetInHouse(b.name, b.house)}` : "";
    bodies[b.name] = `${sign}${house}`.trim();
  }

  const points: Record<string, string> = {};
  for (const p of [chart.points.northNode, chart.points.southNode, chart.points.lilith, chart.points.partOfFortune]) {
    if (!p) continue;
    const base = PLANET_MEANING[p.name]?.fn ?? p.name;
    const house = p.house ? ` ${planetInHouse(p.name, p.house)}` : "";
    points[p.name] = `${base} in ${p.sign}.${house}`.trim();
  }

  let angles: Record<string, string> | undefined;
  if (chart.angles) {
    angles = {
      ascendant: ascendantText(chart.angles.ascendant.sign),
      midheaven: midheavenText(chart.angles.midheaven.sign),
    };
  }

  const aspects = chart.aspects.map((a) => aspectText(a.between[0], a.between[1], a.type)).filter(Boolean);

  return { bodies, points, ...(angles ? { angles } : {}), aspects };
}

export { SIGNS };
