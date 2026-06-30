import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { pairBody, type PairBody } from "../schemas";
import { resolveBirth } from "./context";
import { computeChart, type Chart } from "../lib/chart";
import { crossAspects, type AspectPoint } from "../lib/aspects";
import { aspectText } from "../lib/interpret";
import { serializeChart, ok } from "../lib/format";

export const synastryRouter = Router();

function chartPoints(chart: Chart): AspectPoint[] {
  const pts: AspectPoint[] = chart.bodies.map((b) => ({ name: b.name, longitude: b.longitude }));
  pts.push({ name: "North Node", longitude: chart.points.northNode.longitude });
  if (chart.angles) {
    pts.push({ name: "Ascendant", longitude: chart.angles.ascendant.longitude });
    pts.push({ name: "Midheaven", longitude: chart.angles.midheaven.longitude });
  }
  return pts;
}

function buildChart(person: PairBody["personA"]) {
  const r = resolveBirth(person);
  return computeChart({
    instant: r.instant,
    latitude: r.latitude,
    longitude: r.longitude,
    houseSystem: person.houseSystem,
    hasTime: r.hasTime,
    includeMinor: person.aspects === "all",
    maxOrb: person.orb,
  });
}

synastryRouter.post("/synastry", validateBody(pairBody), (_req, res) => {
  const body = res.locals.valid as PairBody;
  const chartA = buildChart(body.personA);
  const chartB = buildChart(body.personB);

  const aspects = crossAspects(chartPoints(chartA), chartPoints(chartB), {
    includeMinor: body.aspects === "all",
    maxOrb: body.orb,
  }).map((a) => ({
    ...a,
    interpretation: aspectText(`A's ${a.between[0]}`, `B's ${a.between[1]}`, a.type),
  }));

  res.json(
    ok({
      personA: serializeChart(chartA),
      personB: serializeChart(chartB),
      interAspects: aspects,
      summary: { aspectCount: aspects.length, tightest: aspects[0] ?? null },
    }),
  );
});
