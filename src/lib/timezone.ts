/**
 * Timezone resolution & instant formatting for birth data.
 *
 * A birth chart needs the absolute UTC instant of birth. Callers give a local
 * calendar date + clock time + a location; we resolve the IANA timezone from the
 * coordinates (or an explicit override) and let Luxon — whose IANA data includes
 * *historical* DST/offset rules — produce the correct instant.
 */

import tzlookup from "tz-lookup";
import { DateTime } from "luxon";

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

export interface ClockTime {
  hour: number; // 0-23
  minute: number; // 0-59
}

export interface FormattedTime {
  iso: string;
  time24: string;
  time12: string;
}

/** Resolve the IANA timezone (e.g. "Asia/Dhaka") for a coordinate. */
export function lookupTimezone(latitude: number, longitude: number): string {
  return tzlookup(latitude, longitude);
}

/** Validate an IANA timezone string. */
export function isValidZone(zone: string): boolean {
  return DateTime.local().setZone(zone).isValid;
}

/** Today's calendar date as observed in the given timezone. */
export function todayInZone(timezone: string): CalendarDate {
  const now = DateTime.now().setZone(timezone);
  return { year: now.year, month: now.month, day: now.day };
}

/** Absolute instant for a local birth date + time in a timezone. */
export function birthInstant(date: CalendarDate, time: ClockTime, timezone: string): Date {
  return DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day, hour: time.hour, minute: time.minute },
    { zone: timezone },
  ).toJSDate();
}

/** Local noon on a calendar date — the reference used when birth time is unknown. */
export function localNoon(date: CalendarDate, timezone: string): Date {
  return birthInstant(date, { hour: 12, minute: 0 }, timezone);
}

/** Format an absolute instant into a location's local clock. */
export function formatInstant(instant: Date, timezone: string): FormattedTime {
  const dt = DateTime.fromJSDate(instant).setZone(timezone).set({ millisecond: 0 });
  return {
    iso: dt.toISO({ suppressMilliseconds: true }) ?? instant.toISOString(),
    time24: dt.toFormat("HH:mm"),
    time12: dt.toFormat("h:mm a"),
  };
}

/** ISO date label, e.g. "1995-03-15". */
export function gregorianLabel({ year, month, day }: CalendarDate): string {
  return DateTime.fromObject({ year, month, day }).toFormat("yyyy-MM-dd");
}

/** Number of days in a Gregorian month. */
export function daysInMonth(year: number, month: number): number {
  return DateTime.fromObject({ year, month, day: 1 }).daysInMonth ?? 30;
}
