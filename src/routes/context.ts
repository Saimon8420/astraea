/** Resolve raw birth data into an absolute instant + timezone + flags. */

import { ApiError } from "../middleware/errorHandler";
import {
  birthInstant,
  localNoon,
  lookupTimezone,
  isValidZone,
  type CalendarDate,
} from "../lib/timezone";
import type { BirthData } from "../schemas";

export interface ResolvedBirth {
  date: CalendarDate;
  instant: Date;
  timezone: string;
  hasTime: boolean;
  latitude?: number;
  longitude?: number;
}

/** Turn validated birth data into the instant + context the engine needs. */
export function resolveBirth(b: BirthData): ResolvedBirth {
  const hasLocation = b.lat !== undefined && b.lng !== undefined;
  const hasTime = b.time !== undefined;

  let timezone: string;
  if (b.tz) {
    if (!isValidZone(b.tz)) {
      throw new ApiError(400, "VALIDATION_ERROR", `Unknown timezone: ${b.tz}`, [
        { field: "tz", message: "must be a valid IANA timezone, e.g. 'Asia/Dhaka'" },
      ]);
    }
    timezone = b.tz;
  } else if (hasLocation) {
    timezone = lookupTimezone(b.lat as number, b.lng as number);
  } else {
    timezone = "UTC";
  }

  if (hasTime && !b.tz && !hasLocation) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "When 'time' is provided, also provide 'lat'/'lng' or 'tz' so the birth time can be anchored to a timezone.",
      [{ field: "time", message: "needs a location (lat/lng) or an explicit tz" }],
    );
  }

  const instant = hasTime
    ? birthInstant(b.date, b.time as { hour: number; minute: number }, timezone)
    : localNoon(b.date, timezone);

  return {
    date: b.date,
    instant,
    timezone,
    hasTime,
    ...(hasLocation ? { latitude: b.lat, longitude: b.lng } : {}),
  };
}
