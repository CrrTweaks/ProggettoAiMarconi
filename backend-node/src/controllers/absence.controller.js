// Controller assenze
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";

export const list = asyncHandler(async (req, res) => {
  const { user_id, class_id, from, to } = req.query;
  const params = [];
  let where = "1=1";

  // Studenti: solo le proprie assenze. Docenti e admin: qualsiasi nelle loro classi
  if (req.user.role === "student") {
    params.push(req.user.id);
    where += ` AND a.user_id = $${params.length}`;
  } else if (user_id) {
    params.push(user_id);
    where += ` AND a.user_id = $${params.length}`;
  }
  if (class_id) {
    params.push(class_id);
    where += ` AND a.class_id = $${params.length}`;
  }
  if (from) {
    params.push(from);
    where += ` AND a.date >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND a.date <= $${params.length}`;
  }

  const { rows } = await query(
    `SELECT a.*, u.full_name AS student_name, c.name AS class_name
     FROM absences a
     JOIN users u   ON u.id = a.user_id
     LEFT JOIN classes c ON c.id = a.class_id
     WHERE ${where}
     ORDER BY a.date DESC`,
    params,
  );
  res.json({ absences: rows });
});

export const create = asyncHandler(async (req, res) => {
  const { user_id, class_id, date, hours, justified, reason } = req.body;
  const { rows } = await query(
    `INSERT INTO absences (user_id, class_id, date, hours, justified, reason)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      user_id,
      class_id || null,
      date,
      hours || 1,
      justified || false,
      reason || null,
    ],
  );
  res.status(201).json({ absence: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { hours, justified, reason } = req.body;
  const { rows } = await query(
    `UPDATE absences SET
       hours     = COALESCE($1, hours),
       justified = COALESCE($2, justified),
       reason    = COALESCE($3, reason)
     WHERE id=$4 RETURNING *`,
    [hours, justified, reason, req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Assenza non trovata");
  res.json({ absence: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await query("DELETE FROM absences WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
