import { Router } from "express";
import { validateBody } from "../middleware/validate";
import { solarReturnBody, type SolarReturnBody } from "../schemas";
import { resolveBirth } from "./context";
import { computeChart } from "../lib/chart";
import { eclipticLongitude } from "../lib/ephemeris";
import { signedDelta } from "../lib/zodiac";
import { lookupTimezone, formatInstant } from "../lib/timezone";
import { serializeChart, ok } from "../lib/format";

export const solarReturnRouter = Router();

/** Instant in `year` when the Sun returns to `targetLon` (bisection ±3 days). */
function solarReturnInstant(year: number, month: number, day: number, targetLon: number): Date {
  const approx = Date.UTC(year, month - 1, day, 12, 0, 0);
  let lo = approx - 3 * 86400000;
  let hi = approx + 3 * 86400000;
  const f = (ms: number) => signedDelta(eclipticLongitude("Sun", new Date(ms)), targetLon);
  let flo = f(lo);
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2;
    const fm = f(mid);
    if (flo * fm <= 0) hi = mid;
    else {
      lo = mid;
      flo = fm;
    }
  }
  return new Date((lo + hi) / 2);
}

solarReturnRouter.post("/solar-return", validateBody(solarReturnBody), (_req, res) => {
  const body = res.locals.valid as SolarReturnBody;
  const r = resolveBirth(body.natal);
  const natalSunLon = eclipticLongitude("Sun", r.instant);

  const instant = solarReturnInstant(body.year, body.natal.date.month, body.natal.date.day, natalSunLon);

  // Location for the return chart: explicit, else the natal location.
  const lat = body.lat ?? r.latitude;
  const lng = body.lng ?? r.longitude;
  const hasLocation = lat !== undefined && lng !== undefined;
  const timezone = body.tz ?? (hasLocation ? lookupTimezone(lat as number, lng as number) : r.timezone);

  const chart = computeChart({
    instant,
    latitude: lat,
    longitude: lng,
    houseSystem: body.houseSystem,
    hasTime: true,
    includeMinor: body.aspects === "all",
    maxOrb: body.orb,
  });

  res.json(
    ok(serializeChart(chart), {
      solarReturn: {
        year: body.year,
        instantUtc: instant.toISOString(),
        localTime: formatInstant(instant, timezone),
        natalSunLongitude: Number(natalSunLon.toFixed(4)),
        ...(hasLocation ? { location: { latitude: lat, longitude: lng, timezone } } : {}),
        houseSystem: chart.houses?.system ?? body.houseSystem,
      },
    }),
  );
});
