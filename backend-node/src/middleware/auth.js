// ════════════════════════════════════════════════════════════════
//  JWT authentication + RBAC middleware
// ════════════════════════════════════════════════════════════════
import { verifyAccessToken } from "../utils/jwt.js";
import { HttpError } from "./error.js";

/** Require a valid access token. Populates req.user. */
export function requireAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new HttpError(401, "Token di accesso mancante");

    const payload = verifyAccessToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    next(new HttpError(401, err.message || "Token non valido"));
  }
}

/** Restrict to specific roles. */
export const requireRole =
  (...allowed) =>
  (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, "Non autenticato"));
    if (!allowed.includes(req.user.role)) {
      return next(
        new HttpError(
          403,
          `Accesso negato: richiede il ruolo ${allowed.join("|")}`,
        ),
      );
    }
    next();
  };

/** Optional auth: attach user if a valid token is present, but don't fail otherwise. */
export function optionalAuth(req, _res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    }
  } catch {
    /* ignore */
  }
  next();
}
