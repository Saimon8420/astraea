import { Router } from "express";
import { DateTime } from "luxon";
import { validateBody } from "../middleware/validate";
import { transitsBody, type TransitsBody } from "../schemas";
import { resolveBirth } from "./context";
import { computeChart } from "../lib/chart";
import { allBodies } from "../lib/ephemeris";
import { houseOf } from "../lib/houses";
import { toSignPosition } from "../lib/zodiac";
import { crossAspects, type AspectPoint } from "../lib/aspects";
import { aspectText } from "../lib/interpret";
import { serializeChart, buildSubjectMeta, ok } from "../lib/format";

export const transitsRouter = Router();

transitsRouter.post("/transits", validateBody(transitsBody), (_req, res) => {
  const body = res.locals.valid as TransitsBody;
  const r = resolveBirth(body.natal);

  const natal = computeChart({
    instant: r.instant,
    latitude: r.latitude,
    longitude: r.longitude,
    houseSystem: body.natal.houseSystem,
    hasTime: r.hasTime,
    includeMinor: body.natal.aspects === "all",
    maxOrb: body.natal.orb,
  });

  // Transit moment (UTC unless transitTz given); defaults to now.
  let transitInstant: Date;
  if (body.transitDate) {
    const t = body.transitTime ?? { hour: 0, minute: 0 };
    transitInstant = DateTime.fromObject(
      { year: body.transitDate.year, month: body.transitDate.month, day: body.transitDate.day, hour: t.hour, minute: t.minute },
      { zone: body.transitTz ?? "UTC" },
    ).toJSDate();
  } else {
    transitInstant = new Date();
    res.setHeader("Cache-Control", "no-store");
  }

  const transiting = allBodies(transitInstant);
  const natalCusps = natal.houses?.cusps.map((c) => c.longitude) ?? null;

  const transitBodies: Record<string, unknown> = {};
  for (const b of transiting) {
    transitBodies[b.name.toLowerCase()] = {
      ...toSignPosition(b.longitude),
      retrograde: b.retrograde,
      speed: b.speed,
      natalHouse: natalCusps ? houseOf(b.longitude, natalCusps) : null,
    };
  }

  // Cross aspects: transiting bodies → natal points (natal frozen, speed 0).
  const natalPoints: AspectPoint[] = natal.bodies.map((b) => ({ name: b.name, longitude: b.longitude, speed: 0 }));
  natalPoints.push({ name: "North Node", longitude: natal.points.northNode.longitude, speed: 0 });
  if (natal.angles) {
    natalPoints.push({ name: "Ascendant", longitude: natal.angles.ascendant.longitude, speed: 0 });
    natalPoints.push({ name: "Midheaven", longitude: natal.angles.midheaven.longitude, speed: 0 });
  }
  const transitPoints: AspectPoint[] = transiting.map((b) => ({ name: b.name, longitude: b.longitude, speed: b.speed }));

  const aspects = crossAspects(transitPoints, natalPoints, {
    includeMinor: body.natal.aspects === "all",
    maxOrb: body.natal.orb,
  }).map((a) => ({
    ...a,
    interpretation: aspectText(`transiting ${a.between[0]}`, `natal ${a.between[1]}`, a.type),
  }));

  res.json(
    ok(
      {
        natal: serializeChart(natal),
        transit: { instantUtc: transitInstant.toISOString(), bodies: transitBodies },
        aspects,
      },
      buildSubjectMeta({
        date: r.date,
        instant: r.instant,
        timezone: r.timezone,
        hasTime: r.hasTime,
        latitude: r.latitude,
        longitude: r.longitude,
        houseSystem: natal.houses?.system ?? body.natal.houseSystem,
      }),
    ),
  );
});
