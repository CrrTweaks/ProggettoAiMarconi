// Controller utenti
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";

export const list = asyncHandler(async (req, res) => {
  const { role, q } = req.query;
  const params = [];
  let where = "deleted_at IS NULL";
  if (role) {
    params.push(role);
    where += ` AND role=$${params.length}`;
  }
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (full_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
  }

  const { rows } = await query(
    `SELECT id, email, full_name, role, avatar_url, created_at
     FROM users WHERE ${where} ORDER BY created_at DESC LIMIT 200`,
    params,
  );
  res.json({ users: rows });
});

export const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, full_name, role, avatar_url, bio, preferences, created_at
     FROM users WHERE id=$1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Utente non trovato");
  res.json({ user: rows[0] });
});

export const updateMe = asyncHandler(async (req, res) => {
  const { full_name, avatar_url, bio, preferences } = req.body;
  const { rows } = await query(
    `UPDATE users SET
       full_name   = COALESCE($1, full_name),
       avatar_url  = COALESCE($2, avatar_url),
       bio         = COALESCE($3, bio),
       preferences = COALESCE($4, preferences)
     WHERE id=$5 AND deleted_at IS NULL
     RETURNING id, email, full_name, role, avatar_url, bio, preferences`,
    [full_name, avatar_url, bio, preferences, req.user.id],
  );
  res.json({ user: rows[0] });
});

export const removeMe = asyncHandler(async (req, res) => {
  await query("UPDATE users SET deleted_at=NOW() WHERE id=$1", [req.user.id]);
  res.json({ ok: true });
});
