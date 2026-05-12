// ════════════════════════════════════════════════════════════════
//  Exams controller
// ════════════════════════════════════════════════════════════════
import { query } from '../config/db.js';
import { HttpError, asyncHandler } from '../middleware/error.js';
import { emitToUser } from '../services/socket.js';

export const list = asyncHandler(async (req, res) => {
  const { class_id, from, to } = req.query;
  const params = [req.user.id];
  let where = `e.class_id IN (
    SELECT c.id FROM classes c
    LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
    WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL))`;
  if (class_id) { params.push(class_id); where += ` AND e.class_id=$${params.length}`; }
  if (from)     { params.push(from);     where += ` AND e.scheduled_for >= $${params.length}`; }
  if (to)       { params.push(to);       where += ` AND e.scheduled_for <= $${params.length}`; }

  const { rows } = await query(
    `SELECT e.*, c.name AS class_name FROM exams e
     JOIN classes c ON c.id = e.class_id
     WHERE ${where}
     ORDER BY e.scheduled_for ASC`,
    params
  );
  res.json({ exams: rows });
});

export const create = asyncHandler(async (req, res) => {
  const { class_id, title, subject, description, scheduled_for, duration_min, topics } = req.body;
  const { rows } = await query(
    `INSERT INTO exams (class_id, teacher_id, title, subject, description, scheduled_for, duration_min, topics)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [class_id, req.user.id, title, subject || null, description || null, scheduled_for, duration_min || 60, topics || null]
  );
  // notify class students
  const { rows: members } = await query(
    `SELECT user_id FROM class_members WHERE class_id=$1 AND role='student'`,
    [class_id]
  );
  for (const m of members) {
    const { rows: n } = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1,'exam',$2,$3,$4) RETURNING *`,
      [m.user_id, `Verifica programmata: ${title}`, description || '', { exam_id: rows[0].id }]
    );
    try { emitToUser(m.user_id, 'notification:new', n[0]); } catch {}
  }
  res.status(201).json({ exam: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { title, subject, description, scheduled_for, duration_min, topics } = req.body;
  const { rows } = await query(
    `UPDATE exams SET
       title         = COALESCE($1, title),
       subject       = COALESCE($2, subject),
       description   = COALESCE($3, description),
       scheduled_for = COALESCE($4, scheduled_for),
       duration_min  = COALESCE($5, duration_min),
       topics        = COALESCE($6, topics)
     WHERE id=$7 RETURNING *`,
    [title, subject, description, scheduled_for, duration_min, topics, req.params.id]
  );
  if (!rows[0]) throw new HttpError(404, 'Exam not found');
  res.json({ exam: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await query('DELETE FROM exams WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
