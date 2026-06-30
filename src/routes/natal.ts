import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { natalBody, type NatalBody } from "../schemas";
import { resolveBirth } from "./context";
import { computeChart } from "../lib/chart";
import { serializeChart, buildSubjectMeta, ok } from "../lib/format";

export const natalRouter = Router();

natalRouter.post("/natal", validateBody(natalBody), (_req, res) => {
  const b = res.locals.valid as NatalBody;
  const r = resolveBirth(b);

  const chart = computeChart({
    instant: r.instant,
    latitude: r.latitude,
    longitude: r.longitude,
    houseSystem: b.houseSystem,
    hasTime: r.hasTime,
    includeMinor: b.aspects === "all",
    maxOrb: b.orb,
  });

  res.json(
    ok(
      serializeChart(chart),
      buildSubjectMeta({
        date: r.date,
        instant: r.instant,
        timezone: r.timezone,
        hasTime: r.hasTime,
        latitude: r.latitude,
        longitude: r.longitude,
        houseSystem: chart.houses?.system ?? b.houseSystem,
      }),
    ),
  );
});
