/** Request validation middleware backed by zod (query string + JSON body). */

import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";
import { ApiError } from "./errorHandler";

function issuesToDetails(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  return error.issues.map((i) => ({
    field: i.path.join(".") || "(root)",
    message: i.message,
  }));
}

/**
 * Validate `req.query` against `schema`. On success the parsed, typed value is
 * stored on `res.locals.valid`. On failure a 400 VALIDATION_ERROR is thrown.
 */
export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid request parameters.", issuesToDetails(result.error));
    }
    res.locals.valid = result.data;
    next();
  };
}

/**
 * Validate `req.body` against `schema`. Used by POST endpoints (natal, transits,
 * synastry, composite, solar-return) that take birth data as JSON.
 */
export function validateBody(schema: ZodType): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid request body.", issuesToDetails(result.error));
    }
    res.locals.valid = result.data;
    next();
  };
}
