import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { v1Router } from "./routes";
import { docsRouter } from "./openapi/docs";
import { rateLimit } from "./middleware/rateLimit";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", true);
  app.disable("x-powered-by");

  app.use(helmet({ contentSecurityPolicy: false })); // docs UI loads its own assets
  app.use(cors()); // public API — open CORS
  app.use(express.json());

  // Vendored static assets (Scalar docs bundle + landing). On Vercel /public is
  // served automatically; this covers local dev.
  app.use(express.static("public"));

  // Deterministic GET responses are CDN-cacheable; live endpoints override with no-store.
  app.use("/v1", (req, res, next) => {
    if (req.method === "GET") res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=3600");
    next();
  });

  app.use("/v1", rateLimit, v1Router);

  // OpenAPI spec at /openapi.json (the docs page itself is static public/index.html).
  app.use(docsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
