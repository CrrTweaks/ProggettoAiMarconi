// Controller compiti
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";
import { emitToUser } from "../services/socket.js";

export const list = asyncHandler(async (req, res) => {
  const { class_id, from, to } = req.query;
  const params = [req.user.id];
  let where = `h.deleted_at IS NULL
    AND h.class_id IN (
      SELECT c.id FROM classes c
      LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
      WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL)
    )`;
  if (class_id) {
    params.push(class_id);
    where += ` AND h.class_id=$${params.length}`;
  }
  if (from) {
    params.push(from);
    where += ` AND h.due_date >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND h.due_date <= $${params.length}`;
  }

  const { rows } = await query(
    `SELECT h.*, c.name AS class_name
     FROM homework h JOIN classes c ON c.id = h.class_id
     WHERE ${where}
     ORDER BY h.due_date ASC`,
    params,
  );
  res.json({ homework: rows });
});

export const create = asyncHandler(async (req, res) => {
  const { class_id, title, description, subject, due_date, priority } =
    req.body;
  const { rows } = await query(
    `INSERT INTO homework (class_id, title, description, subject, due_date, priority, assigned_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      class_id,
      title,
      description || null,
      subject || null,
      due_date,
      priority || 1,
      req.user.id,
    ],
  );
  // Notifica i membri della classe
  const { rows: members } = await query(
    `SELECT user_id FROM class_members WHERE class_id=$1 AND role='student'`,
    [class_id],
  );
  for (const m of members) {
    const { rows: n } = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1,'homework',$2,$3,$4) RETURNING *`,
      [
        m.user_id,
        `Nuovi compiti: ${title}`,
        description || "",
        { homework_id: rows[0].id },
      ],
    );
    try {
      emitToUser(m.user_id, "notification:new", n[0]);
    } catch {}
  }
  res.status(201).json({ homework: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { title, description, subject, due_date, priority } = req.body;
  const { rows } = await query(
    `UPDATE homework SET
       title       = COALESCE($1, title),
       description = COALESCE($2, description),
       subject     = COALESCE($3, subject),
       due_date    = COALESCE($4, due_date),
       priority    = COALESCE($5, priority)
     WHERE id=$6 AND deleted_at IS NULL
     RETURNING *`,
    [title, description, subject, due_date, priority, req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Compito non trovato");
  res.json({ homework: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await query("UPDATE homework SET deleted_at=NOW() WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});
