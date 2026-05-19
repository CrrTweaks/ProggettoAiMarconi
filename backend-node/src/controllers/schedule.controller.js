import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";

export const listByClass = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.*, u.full_name AS teacher_name
     FROM schedules s
     LEFT JOIN users u ON u.id = s.teacher_id
     WHERE s.class_id=$1
     ORDER BY s.weekday, s.start_time`,
    [req.params.classId],
  );
  res.json({ schedules: rows });
});

export const listMySchedules = asyncHandler(async (req, res) => {
  const user = req.user;
  if (user.role === "teacher" || user.role === "admin") {
    const { rows } = await query(
      `SELECT s.*, c.name AS class_name, u.full_name AS teacher_name
       FROM schedules s
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = s.teacher_id
       WHERE s.teacher_id=$1
       ORDER BY s.weekday, s.start_time`,
      [user.id],
    );
    return res.json({ schedules: rows });
  }
  // Studente: trova la prima classe a cui appartiene e restituisci il suo orario
  const { rows: classes } = await query(
    `SELECT c.id, c.name FROM classes c
     LEFT JOIN class_members m ON m.class_id = c.id AND m.user_id = $1
     WHERE c.deleted_at IS NULL AND (c.owner_id = $1 OR m.user_id IS NOT NULL)
     ORDER BY c.created_at DESC LIMIT 1`,
    [user.id],
  );
  if (!classes[0]) {
    return res.json({ schedules: [], class: null });
  }
  const { rows } = await query(
    `SELECT s.*, u.full_name AS teacher_name
     FROM schedules s
     LEFT JOIN users u ON u.id = s.teacher_id
     WHERE s.class_id=$1
     ORDER BY s.weekday, s.start_time`,
    [classes[0].id],
  );
  res.json({ schedules: rows, class: classes[0] });
});

export const create = asyncHandler(async (req, res) => {
  const { class_id, subject, room, teacher_id } = req.body;
  const weekday = req.body.weekday ?? 0;
  const start_time = req.body.start_time ?? "00:00";
  const end_time = req.body.end_time ?? "00:00";
  if (weekday < 0 || weekday > 6) {
    throw new HttpError(400, "Giorno settimana non valido (0-6)");
  }
  const { rows } = await query(
    `INSERT INTO schedules (class_id, weekday, start_time, end_time, subject, room, teacher_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      class_id,
      weekday,
      start_time,
      end_time,
      subject,
      room || null,
      teacher_id || null,
    ],
  );
  res.status(201).json({ schedule: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { weekday, start_time, end_time, subject, room, teacher_id } = req.body;
  const { rows } = await query(
    `UPDATE schedules
     SET weekday=$1, start_time=$2, end_time=$3, subject=$4, room=$5, teacher_id=$6
     WHERE id=$7 RETURNING *`,
    [
      weekday,
      start_time,
      end_time,
      subject,
      room || null,
      teacher_id || null,
      req.params.id,
    ],
  );
  if (!rows[0]) throw new HttpError(404, "Slot non trovato");
  res.json({ schedule: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `DELETE FROM schedules WHERE id=$1 RETURNING id`,
    [req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Slot non trovato");
  res.json({ ok: true });
});
