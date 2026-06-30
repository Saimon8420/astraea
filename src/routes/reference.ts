import { Router, type Request, type Response } from "express";
import { ApiError } from "../middleware/errorHandler";
import { SIGNS, type Sign } from "../lib/zodiac";
import { PLANET_MEANING, HOUSE_MEANING, ASPECT_MEANING, signBasics } from "../lib/interpret";
import { ASPECT_TYPES } from "../lib/aspects";
import { ok } from "../lib/format";

export const referenceRouter = Router();

const signsList = () => SIGNS.map((s) => signBasics(s));
const planetsList = () =>
  Object.entries(PLANET_MEANING).map(([name, m]) => ({ name, keyword: m.keyword, meaning: m.fn }));
const housesList = () =>
  Object.entries(HOUSE_MEANING).map(([n, m]) => ({ house: Number(n), keyword: m.keyword, rules: m.area }));
const aspectsList = () =>
  ASPECT_TYPES.map((t) => ({
    name: t.name,
    angle: t.angle,
    defaultOrb: t.orb,
    kind: t.kind,
    meaning: ASPECT_MEANING[t.name]?.tone ?? "",
  }));

function handleReference(req: Request, res: Response): Response {
  const params = req.params as Record<string, string | undefined>;
  const category = params.category as string;
  const key = params.key;
  const k = key?.toLowerCase();

  switch (category) {
    case "signs": {
      if (!k) return res.json(ok(signsList()));
      const sign = SIGNS.find((s) => s.toLowerCase() === k);
      if (!sign) throw new ApiError(404, "NOT_FOUND", `Unknown sign: ${key}`);
      return res.json(ok(signBasics(sign as Sign)));
    }
    case "planets": {
      if (!k) return res.json(ok(planetsList()));
      const entry = planetsList().find((p) => p.name.toLowerCase() === k);
      if (!entry) throw new ApiError(404, "NOT_FOUND", `Unknown planet/point: ${key}`);
      return res.json(ok(entry));
    }
    case "houses": {
      if (!k) return res.json(ok(housesList()));
      const entry = housesList().find((h) => String(h.house) === k);
      if (!entry) throw new ApiError(404, "NOT_FOUND", `Unknown house: ${key} (use 1–12)`);
      return res.json(ok(entry));
    }
    case "aspects": {
      if (!k) return res.json(ok(aspectsList()));
      const entry = aspectsList().find((a) => a.name.toLowerCase() === k);
      if (!entry) throw new ApiError(404, "NOT_FOUND", `Unknown aspect: ${key}`);
      return res.json(ok(entry));
    }
    default:
      throw new ApiError(404, "NOT_FOUND", `Unknown reference category: ${category}. Try signs, planets, houses or aspects.`);
  }
}

referenceRouter.get("/reference/:category", handleReference);
referenceRouter.get("/reference/:category/:key", handleReference);
