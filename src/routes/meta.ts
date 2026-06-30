import { Router } from "express";
import { ok } from "../lib/format";

export const metaRouter = Router();

metaRouter.get("/health", (_req, res) => {
  res.json(ok({ status: "ok", uptime: Math.round(process.uptime()) }));
});
