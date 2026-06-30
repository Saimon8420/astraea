import { Router } from "express";
import { openapiSpec } from "./spec";

export const docsRouter = Router();

// Machine-readable spec — importable into Postman, Insomnia, etc.
// The interactive docs page itself is served as a static file (public/index.html)
// so it never depends on the serverless function.
docsRouter.get("/openapi.json", (_req, res) => {
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(openapiSpec);
});
