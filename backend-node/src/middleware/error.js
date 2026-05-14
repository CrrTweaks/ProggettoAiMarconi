// ════════════════════════════════════════════════════════════════
//  Centralised error handling
// ════════════════════════════════════════════════════════════════
import { logger } from "../config/logger.js";

export class HttpError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (req, res) =>
  res.status(404).json({ error: "Non trovato", path: req.originalUrl });

export const errorHandler = (err, req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) logger.error({ err, path: req.originalUrl }, err.message);
  else logger.warn({ status, path: req.originalUrl }, err.message);

  res.status(status).json({
    error: err.message || "Errore interno del server",
    ...(err.details ? { details: err.details } : {}),
  });
};

/** Wrap async route handlers to forward rejections to errorHandler */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
