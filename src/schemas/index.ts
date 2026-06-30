/** Request validation schemas (zod) for body + query inputs. */

import { z } from "zod";

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
const tz = z.string().min(1).optional();

/** Birth data shared by natal / transits / synastry / composite / solar-return. */
export const birthData = z.object({
  date: calendarDate,
  time: clockTime.optional(),
  lat: latitude.optional(),
  lng: longitude.optional(),
  tz,
});
export type BirthData = z.infer<typeof birthData>;

/** POST /v1/natal */
export const natalBody = birthData.extend({
  houseSystem,
  aspects: aspectMode,
  orb,
});
export type NatalBody = z.infer<typeof natalBody>;

/** POST /v1/transits */
export const transitsBody = z.object({
  natal: birthData.extend({ houseSystem, aspects: aspectMode, orb }),
  transitDate: calendarDate.optional(),
  transitTime: clockTime.optional(),
  transitTz: tz,
});
export type TransitsBody = z.infer<typeof transitsBody>;

/** POST /v1/synastry & /v1/composite */
export const pairBody = z.object({
  personA: birthData.extend({ houseSystem, aspects: aspectMode, orb }),
  personB: birthData.extend({ houseSystem, aspects: aspectMode, orb }),
  aspects: aspectMode,
  orb,
});
export type PairBody = z.infer<typeof pairBody>;

/** POST /v1/solar-return */
export const solarReturnBody = z.object({
  natal: birthData,
  year: z.coerce.number().int().min(1900).max(2200),
  lat: latitude.optional(),
  lng: longitude.optional(),
  tz,
  houseSystem,
  aspects: aspectMode,
  orb,
});
export type SolarReturnBody = z.infer<typeof solarReturnBody>;

/** GET /v1/positions */
export const positionsQuery = z.object({
  date: calendarDate.optional(),
  time: clockTime.optional(),
});
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
export const horoscopeQuery = z.object({
  sign: z.enum(SIGN_KEYS),
  date: calendarDate.optional(),
});
export type HoroscopeQuery = z.infer<typeof horoscopeQuery>;
