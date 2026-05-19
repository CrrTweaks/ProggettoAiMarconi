// Controller interrogazioni
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";
import { emitToUser } from "../services/socket.js";
import {
  assertClassMembership,
  assertResourceClassMembership,
} from "../services/permissions.js";

export const list = asyncHandler(async (req, res) => {
  const { class_id, subject, student_id, from, to } = req.query;
  const params = [req.user.id];
  let where = req.user.role === "admin"
    ? `i.class_id IN (SELECT id FROM classes WHERE deleted_at IS NULL AND $1::uuid=$1::uuid)`
    : `i.class_id IN (
    SELECT c.id FROM classes c
    LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
    WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL))`;

  if (req.user.role === "student") {
    params.push(req.user.id);
    where += ` AND i.student_id = $${params.length}`;
  } else if (student_id) {
    params.push(student_id);
    where += ` AND i.student_id = $${params.length}`;
  }
  if (class_id) {
    params.push(class_id);
    where += ` AND i.class_id=$${params.length}`;
  }
  if (subject) {
    params.push(subject);
    where += ` AND i.subject = $${params.length}`;
  }
  if (from) {
    params.push(from);
    where += ` AND i.scheduled_for >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND i.scheduled_for <= $${params.length}`;
  }

  // Teacher senza filtro subject: mostra solo le sue materie
  if (req.user.role === "teacher" && !subject) {
    const { rows: subjRows } = await query(
      `SELECT DISTINCT subject FROM schedules WHERE teacher_id=$1`,
      [req.user.id],
    );
    if (subjRows.length > 0) {
      params.push(subjRows.map((r) => r.subject));
      where += ` AND i.subject = ANY($${params.length})`;
    }
  }

  const { rows } = await query(
    `SELECT i.*, c.name AS class_name,
            s.full_name AS student_name, t.full_name AS teacher_name
     FROM interrogations i
     JOIN classes c ON c.id = i.class_id
     LEFT JOIN users s ON s.id = i.student_id
     LEFT JOIN users t ON t.id = i.teacher_id
     WHERE ${where}
     ORDER BY i.scheduled_for ASC`,
    params,
  );
  res.json({ interrogations: rows });
});

export const create = asyncHandler(async (req, res) => {
  const { class_id, student_id, subject, topic, scheduled_for } = req.body;
  await assertClassMembership(req.user, class_id);

  if (req.user.role === "teacher" && subject) {
    const { rows: subjCheck } = await query(
      `SELECT 1 FROM schedules
       WHERE teacher_id=$1 AND class_id=$2 AND subject=$3
       LIMIT 1`,
      [req.user.id, class_id, subject],
    );
    if (!subjCheck[0]) {
      throw new HttpError(
        403,
        "Non sei assegnato a insegnare questa materia nella classe selezionata",
      );
    }
  }

  const { rows } = await query(
    `INSERT INTO interrogations (class_id, student_id, teacher_id, subject, topic, scheduled_for)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [
      class_id,
      student_id || null,
      req.user.role === "admin" && req.body.teacher_id
        ? req.body.teacher_id
        : req.user.id,
      subject || null,
      topic || null,
      scheduled_for,
    ],
  );
  if (student_id) {
    const { rows: n } = await query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ($1,'interrogation',$2,$3,$4) RETURNING *`,
      [
        student_id,
        `Interrogazione programmata: ${subject || ""}`.trim(),
        topic || "",
        { interrogation_id: rows[0].id },
      ],
    );
    try {
      emitToUser(student_id, "notification:new", n[0]);
    } catch {}
  }
  res.status(201).json({ interrogation: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { subject, topic, scheduled_for, grade, notes } = req.body;
  await assertResourceClassMembership(
    req.user,
    "interrogations",
    req.params.id,
  );

  if (req.user.role === "teacher" && subject) {
    const { rows: r } = await query(
      `SELECT class_id FROM interrogations WHERE id=$1`,
      [req.params.id],
    );
    const { rows: subjCheck } = await query(
      `SELECT 1 FROM schedules
       WHERE teacher_id=$1 AND class_id=$2 AND subject=$3
       LIMIT 1`,
      [req.user.id, r[0].class_id, subject],
    );
    if (!subjCheck[0]) {
      throw new HttpError(
        403,
        "Non sei assegnato a insegnare questa materia nella classe selezionata",
      );
    }
  }

  const { rows } = await query(
    `UPDATE interrogations SET
       subject       = COALESCE($1, subject),
       topic         = COALESCE($2, topic),
       scheduled_for = COALESCE($3, scheduled_for),
       grade         = COALESCE($4, grade),
       notes         = COALESCE($5, notes)
     WHERE id=$6 RETURNING *`,
    [subject, topic, scheduled_for, grade, notes, req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Interrogazione non trovata");
  res.json({ interrogation: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await assertResourceClassMembership(
    req.user,
    "interrogations",
    req.params.id,
  );
  await query("DELETE FROM interrogations WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});
