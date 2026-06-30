import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { pairBody, type PairBody } from "../schemas";
import { resolveBirth } from "./context";
import { computeChart, type Chart } from "../lib/chart";
import { detectAspects, type AspectPoint } from "../lib/aspects";
import { houseOf } from "../lib/houses";
import { norm360, signedDelta, toSignPosition, dignityOf } from "../lib/zodiac";
import { planetInSign, planetInHouse, ascendantText, midheavenText, aspectText } from "../lib/interpret";
import { ok } from "../lib/format";

export const compositeRouter = Router();

/** Midpoint along the shorter arc. */
function midpoint(a: number, b: number): number {
  return norm360(a + signedDelta(b, a) / 2);
}

function buildChart(person: PairBody["personA"]): Chart {
  const r = resolveBirth(person);
  return computeChart({
    instant: r.instant,
    latitude: r.latitude,
    longitude: r.longitude,
    houseSystem: person.houseSystem,
    hasTime: r.hasTime,
  });
}

compositeRouter.post("/composite", validateBody(pairBody), (_req, res) => {
  const body = res.locals.valid as PairBody;
  const a = buildChart(body.personA);
  const b = buildChart(body.personB);

  // Composite angles + equal houses from the composite Ascendant.
  let cusps: number[] | null = null;
  let angles: Record<string, unknown> | null = null;
  if (a.angles && b.angles) {
    const asc = midpoint(a.angles.ascendant.longitude, b.angles.ascendant.longitude);
    const mc = midpoint(a.angles.midheaven.longitude, b.angles.midheaven.longitude);
    cusps = Array.from({ length: 12 }, (_, i) => norm360(asc + i * 30));
    angles = {
      ascendant: { ...toSignPosition(asc), interpretation: ascendantText(toSignPosition(asc).sign) },
      midheaven: { ...toSignPosition(mc), interpretation: midheavenText(toSignPosition(mc).sign) },
      descendant: toSignPosition(norm360(asc + 180)),
      imumCoeli: toSignPosition(norm360(mc + 180)),
    };
  }

  const aspectPoints: AspectPoint[] = [];
  const bodies: Record<string, unknown> = {};
  for (let i = 0; i < a.bodies.length; i += 1) {
    const lon = midpoint(a.bodies[i].longitude, b.bodies[i].longitude);
    const p = toSignPosition(lon);
    const house = cusps ? houseOf(lon, cusps) : null;
    const name = a.bodies[i].name;
    const dignity = dignityOf(name, p.sign);
    bodies[name.toLowerCase()] = {
      ...p,
      house,
      dignity,
      interpretation: `${planetInSign(name, p.sign, dignity)}${house ? ` ${planetInHouse(name, house)}` : ""}`.trim(),
    };
    aspectPoints.push({ name, longitude: lon });
  }

  const nnLon = midpoint(a.points.northNode.longitude, b.points.northNode.longitude);
  const lilithLon = midpoint(a.points.lilith.longitude, b.points.lilith.longitude);
  const points = {
    northNode: { ...toSignPosition(nnLon), house: cusps ? houseOf(nnLon, cusps) : null },
    southNode: { ...toSignPosition(norm360(nnLon + 180)), house: cusps ? houseOf(norm360(nnLon + 180), cusps) : null },
    lilith: { ...toSignPosition(lilithLon), house: cusps ? houseOf(lilithLon, cusps) : null },
  };
  aspectPoints.push({ name: "North Node", longitude: nnLon });
  if (angles) {
    aspectPoints.push({ name: "Ascendant", longitude: (angles.ascendant as { longitude: number }).longitude });
    aspectPoints.push({ name: "Midheaven", longitude: (angles.midheaven as { longitude: number }).longitude });
  }

  const aspects = detectAspects(aspectPoints, {
    includeMinor: body.aspects === "all",
    maxOrb: body.orb,
  }).map((asp) => ({ ...asp, interpretation: aspectText(asp.between[0], asp.between[1], asp.type) }));

  res.json(
    ok({
      method: "midpoint composite (equal houses from the composite Ascendant)",
      bodies,
      points,
      angles,
      houses: cusps
        ? { system: "equal", cusps: cusps.map((c, i) => ({ house: i + 1, ...toSignPosition(c) })) }
        : null,
      aspects,
    }),
  );
});
