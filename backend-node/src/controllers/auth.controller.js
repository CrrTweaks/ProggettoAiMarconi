// Controller autenticazione: registrazione, login, refresh, logout e profilo
import { query } from "../config/db.js";
import { hashPassword, comparePassword } from "../utils/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { HttpError, asyncHandler } from "../middleware/error.js";

const REFRESH_COOKIE = "aiws_refresh";
const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/auth",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req, res) => {
  const { email, password, full_name, role = "student" } = req.body;

  const exists = await query("SELECT 1 FROM users WHERE email=$1", [email]);
  if (exists.rowCount) throw new HttpError(409, "Email già registrata");

  const password_hash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1,$2,$3,$4)
     RETURNING id, email, full_name, role, avatar_url, created_at`,
    [email, password_hash, full_name, role],
  );

  const user = rows[0];
  const access = signAccessToken(user);
  const refresh = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
  res.status(201).json({ user, access_token: access, refresh_token: refresh });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { rows } = await query(
    `SELECT id, email, password_hash, full_name, role, avatar_url, is_active
     FROM users WHERE email=$1 AND deleted_at IS NULL`,
    [email],
  );
  const user = rows[0];
  if (!user || !user.is_active)
    throw new HttpError(401, "Credenziali non valide");

  const ok = await comparePassword(password, user.password_hash);
  if (!ok) throw new HttpError(401, "Credenziali non valide");

  await query("UPDATE users SET last_login_at=NOW() WHERE id=$1", [user.id]);

  const safe = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    avatar_url: user.avatar_url,
  };
  const access = signAccessToken(safe);
  const refresh = signRefreshToken(safe);
  res.cookie(REFRESH_COOKIE, refresh, cookieOpts);
  res.json({ user: safe, access_token: access, refresh_token: refresh });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refresh_token;
  if (!token) throw new HttpError(401, "Token di refresh mancante");

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, "Token di refresh non valido");
  }

  const { rows } = await query(
    `SELECT id, email, full_name, role, avatar_url
     FROM users WHERE id=$1 AND deleted_at IS NULL`,
    [payload.sub],
  );
  const user = rows[0];
  if (!user) throw new HttpError(401, "Utente non trovato");

  const access = signAccessToken(user);
  const refresh2 = signRefreshToken(user);
  res.cookie(REFRESH_COOKIE, refresh2, cookieOpts);
  res.json({ access_token: access, refresh_token: refresh2 });
});

export const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE, { path: "/auth" });
  res.json({ ok: true });
});

export const me = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, full_name, role, avatar_url, bio, preferences, last_login_at, created_at
     FROM users WHERE id=$1 AND deleted_at IS NULL`,
    [req.user.id],
  );
  if (!rows[0]) throw new HttpError(404, "Utente non trovato");
  res.json({ user: rows[0] });
});
