/**
 * Chart assembly — combines ephemeris, derived points, houses and aspects into
 * a single natal chart structure. Gracefully degrades when birth time and/or
 * location are unknown (no angles/houses; Moon flagged as sign-uncertain).
 */

import { allBodies, bodyPosition, type BodyPosition } from "./ephemeris";
import { computeHouses, houseOf, type HouseSystem, type Houses } from "./houses";
import { detectAspects, type Aspect, type AspectPoint } from "./aspects";
import { meanNorthNode, meanSouthNode, meanLilith, partOfFortune } from "./points";
import { toSignPosition, dignityOf, type SignPosition, type Dignity } from "./zodiac";

export interface PlacedBody extends SignPosition {
  name: string;
  house: number | null;
  retrograde: boolean;
  speed: number;
  distanceKm: number;
  dignity: Dignity;
}

export interface PlacedPoint extends SignPosition {
  name: string;
  house: number | null;
}

export interface ChartInput {
  instant: Date;
  latitude?: number;
  longitude?: number; // east-positive
  houseSystem: HouseSystem;
  hasTime: boolean;
  includeMinor?: boolean;
  maxOrb?: number;
}

export interface Chart {
  bodies: PlacedBody[];
  points: {
    northNode: PlacedPoint;
    southNode: PlacedPoint;
    lilith: PlacedPoint;
    partOfFortune: PlacedPoint | null;
  };
  angles: {
    ascendant: SignPosition;
    midheaven: SignPosition;
    descendant: SignPosition;
    imumCoeli: SignPosition;
  } | null;
  houses: { system: HouseSystem; cusps: Array<{ house: number } & SignPosition>; note?: string } | null;
  aspects: Aspect[];
  notes: string[];
}

function placeBody(b: BodyPosition, cusps: number[] | null): PlacedBody {
  const pos = toSignPosition(b.longitude);
  return {
    name: b.name,
    ...pos,
    house: cusps ? houseOf(b.longitude, cusps) : null,
    retrograde: b.retrograde,
    speed: b.speed,
    distanceKm: b.distanceKm,
    dignity: dignityOf(b.name, pos.sign),
  };
}

function placePoint(name: string, longitude: number, cusps: number[] | null): PlacedPoint {
  return { name, ...toSignPosition(longitude), house: cusps ? houseOf(longitude, cusps) : null };
}

export function computeChart(input: ChartInput): Chart {
  const { instant, latitude, longitude, houseSystem, hasTime } = input;
  const notes: string[] = [];

  const hasLocation = latitude !== undefined && longitude !== undefined;
  const canHouses = hasLocation && hasTime;

  let houses: Houses | null = null;
  if (canHouses) {
    houses = computeHouses(instant, latitude as number, longitude as number, houseSystem);
    if (houses.note) notes.push(houses.note);
  } else if (!hasTime) {
    notes.push(
      "Birth time unknown: Ascendant, Midheaven and house cusps are omitted, and the Moon's sign may be uncertain (it can change sign within a day).",
    );
  } else if (!hasLocation) {
    notes.push("No location provided: Ascendant, Midheaven and house cusps are omitted.");
  }

  const cusps = houses?.cusps ?? null;

  const bodies = allBodies(instant).map((b) => placeBody(b, cusps));
  const byName = Object.fromEntries(bodies.map((b) => [b.name, b]));

  // Derived points.
  const northNode = placePoint("North Node", meanNorthNode(instant), cusps);
  const southNode = placePoint("South Node", meanSouthNode(instant), cusps);
  const lilith = placePoint("Lilith", meanLilith(instant), cusps);

  let partOfFortuneP: PlacedPoint | null = null;
  let angles: Chart["angles"] = null;
  if (houses) {
    const a = houses.angles;
    angles = {
      ascendant: toSignPosition(a.ascendant),
      midheaven: toSignPosition(a.midheaven),
      descendant: toSignPosition(a.descendant),
      imumCoeli: toSignPosition(a.imumCoeli),
    };
    const sunHouse = byName.Sun.house ?? 1;
    const isDay = sunHouse >= 7 && sunHouse <= 12; // Sun above the horizon
    partOfFortuneP = placePoint(
      "Part of Fortune",
      partOfFortune(a.ascendant, byName.Sun.longitude, byName.Moon.longitude, isDay),
      cusps,
    );
  }

  // Aspects: 10 bodies + North Node + (Asc/MC when available).
  const aspectPoints: AspectPoint[] = bodies.map((b) => ({
    name: b.name,
    longitude: b.longitude,
    speed: b.speed,
  }));
  aspectPoints.push({
    name: "North Node",
    longitude: northNode.longitude,
    speed: nodeSpeed(instant),
  });
  if (angles) {
    aspectPoints.push({ name: "Ascendant", longitude: angles.ascendant.longitude });
    aspectPoints.push({ name: "Midheaven", longitude: angles.midheaven.longitude });
  }

  const aspects = detectAspects(aspectPoints, {
    includeMinor: input.includeMinor,
    maxOrb: input.maxOrb,
  });

  const housesOut = houses
    ? {
        system: houses.system,
        cusps: houses.cusps.map((c, i) => ({ house: i + 1, ...toSignPosition(c) })),
        ...(houses.note ? { note: houses.note } : {}),
      }
    : null;

  return {
    bodies,
    points: { northNode, southNode, lilith, partOfFortune: partOfFortuneP },
    angles,
    houses: housesOut,
    aspects,
    notes,
  };
}

const DAY_MS = 86400000;
/** Finite-difference daily speed of the mean node (≈ −0.053°/day). */
function nodeSpeed(instant: Date): number {
  const a = meanNorthNode(new Date(instant.getTime() - 0.5 * DAY_MS));
  const b = meanNorthNode(new Date(instant.getTime() + 0.5 * DAY_MS));
  let d = b - a;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

export { bodyPosition };
