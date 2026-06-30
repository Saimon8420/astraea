import { Router } from "express";
import { DateTime } from "luxon";
import { validateQuery } from "../middleware/validate";
import { horoscopeQuery, type HoroscopeQuery } from "../schemas";
import { eclipticLongitude } from "../lib/ephemeris";
import { signOf, ELEMENTS, type Sign } from "../lib/zodiac";
import { signBasics, SIGN_MEANING } from "../lib/interpret";
import { gregorianLabel, type CalendarDate } from "../lib/timezone";
import { ok } from "../lib/format";

export const horoscopeRouter = Router();

const COMPATIBLE: Record<string, string> = { Fire: "Air", Air: "Fire", Earth: "Water", Water: "Earth" };

function dayTheme(sun: Sign, moon: Sign): string {
  const es = ELEMENTS[sun];
  const em = ELEMENTS[moon];
  const moonKw = SIGN_MEANING[moon].keywords[0];
  if (es === em) {
    return `The Moon in ${moon} flows easily with your ${sun} nature — a day that feels in sync. Let your ${moonKw} side lead.`;
  }
  if (COMPATIBLE[es] === em) {
    return `The Moon in ${moon} supports your ${sun} energy. Momentum favours a ${moonKw} approach today.`;
  }
  return `The Moon in ${moon} pulls against your ${sun} instincts. A little patience turns ${moonKw} friction into real progress.`;
}

horoscopeRouter.get("/horoscope", validateQuery(horoscopeQuery), (_req, res) => {
  const q = res.locals.valid as HoroscopeQuery;
  const sign = (q.sign[0].toUpperCase() + q.sign.slice(1)) as Sign;

  const date: CalendarDate = q.date ?? {
    year: DateTime.utc().year,
    month: DateTime.utc().month,
    day: DateTime.utc().day,
  };
  if (!q.date) res.setHeader("Cache-Control", "no-store");

  const noonUtc = DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day, hour: 12 },
    { zone: "UTC" },
  ).toJSDate();
  const moonSign = signOf(eclipticLongitude("Moon", noonUtc));

  const focus = SIGN_MEANING[sign].keywords;
  const message = `${dayTheme(sign, moonSign)} Channel your ${focus[0]} and ${focus[2]} strengths, and watch the tendency to be ${focus[3]}.`;

  res.json(
    ok({
      sign: signBasics(sign),
      date: gregorianLabel(date),
      moon: { sign: moonSign },
      message,
    }),
  );
});
