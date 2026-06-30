import { Router } from "express";
import { DateTime } from "luxon";
import { validateQuery } from "../middleware/validate";
import { positionsQuery, type PositionsQuery } from "../schemas";
import { allBodies } from "../lib/ephemeris";
import { toSignPosition } from "../lib/zodiac";
import { ok } from "../lib/format";

export const positionsRouter = Router();

// Planetary positions for any instant — geocentric, location-independent.
// Date/time are interpreted as UTC; omit them for "right now".
positionsRouter.get("/positions", validateQuery(positionsQuery), (_req, res) => {
  const q = res.locals.valid as PositionsQuery;

  let instant: Date;
  let live = false;
  if (q.date) {
    const t = q.time ?? { hour: 0, minute: 0 };
    instant = DateTime.fromObject(
      { year: q.date.year, month: q.date.month, day: q.date.day, hour: t.hour, minute: t.minute },
      { zone: "UTC" },
    ).toJSDate();
  } else {
    instant = new Date();
    live = true;
  }

  if (live) res.setHeader("Cache-Control", "no-store");

  const bodies: Record<string, unknown> = {};
  for (const b of allBodies(instant)) {
    bodies[b.name.toLowerCase()] = {
      ...toSignPosition(b.longitude),
      retrograde: b.retrograde,
      speed: b.speed,
      distanceKm: b.distanceKm,
    };
  }

  res.json(ok({ bodies }, { instantUtc: instant.toISOString(), frame: "geocentric ecliptic of date" }));
});
