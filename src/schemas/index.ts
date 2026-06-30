/** Request validation schemas (zod) for body + query inputs. */

import { z } from "zod";
import { isValidZone } from "../lib/timezone";

/**
 * Recursively drop empty-string / null properties before validation. API clients
 * (and the Scalar docs UI) routinely send `"tz": ""` for untouched optional
 * fields — those should mean "not provided", not a validation error.
 */
function stripEmpty(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripEmpty);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v === "" || v === null) continue;
      out[k] = stripEmpty(v);
    }
    return out;
  }
  return value;
}

const latitude = z.coerce
  .number({ message: "lat must be a number" })
  .min(-90, "lat must be between -90 and 90")
  .max(90, "lat must be between -90 and 90");

const longitude = z.coerce
  .number({ message: "lng must be a number" })
  .min(-180, "lng must be between -180 and 180")
  .max(180, "lng must be between -180 and 180");

/** "YYYY-MM-DD" → { year, month, day }. */
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format")
  .transform((s, ctx) => {
    const [year, month, day] = s.split("-").map(Number);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() + 1 !== month ||
      probe.getUTCDate() !== day
    ) {
      ctx.addIssue({ code: "custom", message: "date is not a valid calendar date" });
      return z.NEVER;
    }
    if (year < 1700 || year > 2200) {
      ctx.addIssue({ code: "custom", message: "year must be between 1700 and 2200 (ephemeris range)" });
      return z.NEVER;
    }
    return { year, month, day };
  });

/** "HH:mm" (24h) → { hour, minute }. */
const clockTime = z
  .string()
  .regex(/^([01]?\d|2[0-3]):[0-5]\d$/, "time must be in HH:mm (24-hour) format")
  .transform((s) => {
    const [hour, minute] = s.split(":").map(Number);
    return { hour, minute };
  });

export const houseSystem = z.enum(["placidus", "whole-sign", "equal"]).default("placidus");
export const aspectMode = z.enum(["major", "all"]).default("major");
const orb = z.coerce.number().min(0).max(15).optional();
const tz = z
  .string()
  .min(1)
  .refine(isValidZone, "must be a valid IANA timezone, e.g. 'Asia/Dhaka'")
  .optional();

/** Birth data shared by natal / transits / synastry / composite / solar-return. */
export const birthData = z.object({
  date: calendarDate,
  time: clockTime.optional(),
  lat: latitude.optional(),
  lng: longitude.optional(),
  tz,
});
export type BirthData = z.infer<typeof birthData>;

const chartOptions = { houseSystem, aspects: aspectMode, orb };

/** POST /v1/natal */
export const natalBody = z.preprocess(stripEmpty, birthData.extend(chartOptions));
export type NatalBody = z.infer<typeof natalBody>;

/** POST /v1/transits */
export const transitsBody = z.preprocess(
  stripEmpty,
  z.object({
    natal: birthData.extend(chartOptions),
    transitDate: calendarDate.optional(),
    transitTime: clockTime.optional(),
    transitTz: tz,
  }),
);
export type TransitsBody = z.infer<typeof transitsBody>;

/** POST /v1/synastry & /v1/composite */
export const pairBody = z.preprocess(
  stripEmpty,
  z.object({
    personA: birthData.extend(chartOptions),
    personB: birthData.extend(chartOptions),
    aspects: aspectMode,
    orb,
  }),
);
export type PairBody = z.infer<typeof pairBody>;

/** POST /v1/solar-return */
export const solarReturnBody = z.preprocess(
  stripEmpty,
  z.object({
    natal: birthData,
    year: z.coerce.number().int().min(1900).max(2200),
    lat: latitude.optional(),
    lng: longitude.optional(),
    tz,
    houseSystem,
    aspects: aspectMode,
    orb,
  }),
);
export type SolarReturnBody = z.infer<typeof solarReturnBody>;

/** GET /v1/positions */
export const positionsQuery = z.preprocess(
  stripEmpty,
  z.object({ date: calendarDate.optional(), time: clockTime.optional() }),
);
export type PositionsQuery = z.infer<typeof positionsQuery>;

export const SIGN_KEYS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

/** GET /v1/horoscope */
export const horoscopeQuery = z.preprocess(
  stripEmpty,
  z.object({ sign: z.enum(SIGN_KEYS), date: calendarDate.optional() }),
);
export type HoroscopeQuery = z.infer<typeof horoscopeQuery>;
