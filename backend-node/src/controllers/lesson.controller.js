// Controller lezioni
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";
import {
  assertClassMembership,
  assertResourceClassMembership,
} from "../services/permissions.js";

export const list = asyncHandler(async (req, res) => {
  const { class_id, from, to } = req.query;
  const params = [req.user.id];
  let where = `l.class_id IN (
    SELECT c.id FROM classes c
    LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
    WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL))`;
  if (class_id) {
    params.push(class_id);
    where += ` AND l.class_id=$${params.length}`;
  }
  if (from) {
    params.push(from);
    where += ` AND l.taught_on >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND l.taught_on <= $${params.length}`;
  }

  const { rows } = await query(
    `SELECT l.*, c.name AS class_name, u.full_name AS teacher_name
     FROM lessons l
     JOIN classes c ON c.id = l.class_id
     LEFT JOIN users u ON u.id = l.teacher_id
     WHERE ${where}
     ORDER BY l.taught_on DESC`,
    params,
  );
  res.json({ lessons: rows });
});

export const create = asyncHandler(async (req, res) => {
  const { class_id, title, topic, notes, taught_on, duration_min } = req.body;
  await assertClassMembership(req.user, class_id);
  const { rows } = await query(
    `INSERT INTO lessons (class_id, teacher_id, title, topic, notes, taught_on, duration_min)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      class_id,
      req.user.id,
      title,
      topic || null,
      notes || null,
      taught_on,
      duration_min || 60,
    ],
  );
  res.status(201).json({ lesson: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { title, topic, notes, taught_on, duration_min } = req.body;
  await assertResourceClassMembership(req.user, "lessons", req.params.id);
  const { rows } = await query(
    `UPDATE lessons SET
       title        = COALESCE($1, title),
       topic        = COALESCE($2, topic),
       notes        = COALESCE($3, notes),
       taught_on    = COALESCE($4, taught_on),
       duration_min = COALESCE($5, duration_min)
     WHERE id=$6
     RETURNING *`,
    [title, topic, notes, taught_on, duration_min, req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Lezione non trovata");
  res.json({ lesson: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await assertResourceClassMembership(req.user, "lessons", req.params.id);
  await query("DELETE FROM lessons WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
