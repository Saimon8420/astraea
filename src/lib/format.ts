/** Response shaping — turns engine output into the public JSON contract. */

import type { Chart, PlacedBody, PlacedPoint } from "./chart";
import type { SignPosition } from "./zodiac";
import { interpretChart } from "./interpret";
import { gregorianLabel, formatInstant, type CalendarDate } from "./timezone";

/** Standard success envelope. */
export function ok<T>(data: T, meta?: unknown) {
  return { success: true as const, data, ...(meta ? { meta } : {}) };
}

const KEY: Record<string, string> = {
  Sun: "sun",
  Moon: "moon",
  Mercury: "mercury",
  Venus: "venus",
  Mars: "mars",
  Jupiter: "jupiter",
  Saturn: "saturn",
  Uranus: "uranus",
  Neptune: "neptune",
  Pluto: "pluto",
  "North Node": "northNode",
  "South Node": "southNode",
  Lilith: "lilith",
  "Part of Fortune": "partOfFortune",
};

function pos(p: SignPosition) {
  return { sign: p.sign, degree: p.degree, degreeDecimal: p.degreeDecimal, longitude: p.longitude };
}

function bodyEntry(b: PlacedBody, text?: string) {
  return {
    ...pos(b),
    house: b.house,
    retrograde: b.retrograde,
    speed: b.speed,
    distanceKm: b.distanceKm,
    dignity: b.dignity,
    ...(text ? { interpretation: text } : {}),
  };
}

function pointEntry(p: PlacedPoint, text?: string) {
  return { ...pos(p), house: p.house, ...(text ? { interpretation: text } : {}) };
}

export interface SerializeOptions {
  interpret?: boolean;
}

/** Serialize a full chart (bodies, points, angles, houses, aspects). */
export function serializeChart(chart: Chart, opts: SerializeOptions = {}) {
  const withText = opts.interpret !== false;
  const interp = withText ? interpretChart(chart) : null;

  const bodies: Record<string, ReturnType<typeof bodyEntry>> = {};
  for (const b of chart.bodies) bodies[KEY[b.name]] = bodyEntry(b, interp?.bodies[b.name]);

  const points: Record<string, ReturnType<typeof pointEntry>> = {};
  for (const p of [chart.points.northNode, chart.points.southNode, chart.points.lilith, chart.points.partOfFortune]) {
    if (p) points[KEY[p.name]] = pointEntry(p, interp?.points[p.name]);
  }

  const angles = chart.angles
    ? {
        ascendant: { ...pos(chart.angles.ascendant), ...(interp?.angles ? { interpretation: interp.angles.ascendant } : {}) },
        midheaven: { ...pos(chart.angles.midheaven), ...(interp?.angles ? { interpretation: interp.angles.midheaven } : {}) },
        descendant: pos(chart.angles.descendant),
        imumCoeli: pos(chart.angles.imumCoeli),
      }
    : null;

  const houses = chart.houses
    ? {
        system: chart.houses.system,
        ...(chart.houses.note ? { note: chart.houses.note } : {}),
        cusps: chart.houses.cusps.map((c) => ({ house: c.house, ...pos(c) })),
      }
    : null;

  const aspects = chart.aspects.map((a, i) => ({
    between: a.between,
    type: a.type,
    angle: a.angle,
    orb: a.orb,
    applying: a.applying,
    ...(withText && interp?.aspects[i] ? { interpretation: interp.aspects[i] } : {}),
  }));

  return { bodies, points, angles, houses, aspects, notes: chart.notes };
}

export interface SubjectMeta {
  date: CalendarDate;
  instant: Date;
  timezone: string;
  hasTime: boolean;
  latitude?: number;
  longitude?: number;
  houseSystem?: string;
}

export function buildSubjectMeta(s: SubjectMeta) {
  return {
    subject: {
      date: gregorianLabel(s.date),
      time: s.hasTime ? formatInstant(s.instant, s.timezone).time24 : null,
      instantUtc: s.instant.toISOString(),
      ...(s.latitude !== undefined && s.longitude !== undefined
        ? { location: { latitude: s.latitude, longitude: s.longitude, timezone: s.timezone } }
        : {}),
    },
    ...(s.houseSystem ? { houseSystem: s.houseSystem } : {}),
  };
}
