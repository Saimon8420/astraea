/** Central error handling — turns thrown errors into the API error envelope. */

import type { Request, Response, NextFunction } from "express";

export class ApiError extends Error {
  statusCode: number;
  code: string;
  details?: unknown;

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Endpoint not found. See / for documentation." },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }

  // Malformed JSON body (from express.json) → 400, not 500.
  if (err && typeof err === "object" && (err as { type?: string }).type === "entity.parse.failed") {
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Request body is not valid JSON." },
    });
    return;
  }

  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message },
  });
}
