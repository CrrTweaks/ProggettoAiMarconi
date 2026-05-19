// Controller compiti
import { query } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";
import { emitToUser } from "../services/socket.js";
import {
  assertClassMembership,
  assertResourceClassMembership,
} from "../services/permissions.js";

export const list = asyncHandler(async (req, res) => {
  const { class_id, subject, from, to } = req.query;
  const params = [req.user.id];
  let where = `h.deleted_at IS NULL`;
  if (req.user.role === "admin") {
    where += ` AND h.class_id IN (SELECT id FROM classes WHERE deleted_at IS NULL AND $1::uuid=$1::uuid)`;
  } else {
    where += ` AND h.class_id IN (
      SELECT c.id FROM classes c
      LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
      WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL)
    )`;
  }
  if (class_id) {
    params.push(class_id);
    where += ` AND h.class_id=$${params.length}`;
  }
  if (subject) {
    params.push(subject);
    where += ` AND h.subject = $${params.length}`;
  }
  if (from) {
    params.push(from);
    where += ` AND h.due_date >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    where += ` AND h.due_date <= $${params.length}`;
  }

  // Teacher senza filtro subject: mostra solo le sue materie
  if (req.user.role === "teacher" && !subject) {
    const { rows: subjRows } = await query(
      `SELECT DISTINCT subject FROM schedules WHERE teacher_id=$1`,
      [req.user.id],
    );
    if (subjRows.length > 0) {
      params.push(subjRows.map((r) => r.subject));
      where += ` AND h.subject = ANY($${params.length})`;
    }
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
  await assertClassMembership(req.user, class_id);

  // Teacher: verifica che insegna questa materia nella classe scelta
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
    `INSERT INTO homework (class_id, title, description, subject, due_date, priority, assigned_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      class_id,
      title,
      description || null,
      subject || null,
      due_date,
      priority || 1,
      req.user.role === "admin" && req.body.assigned_by
        ? req.body.assigned_by
        : req.user.id,
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
  await assertResourceClassMembership(req.user, "homework", req.params.id);

  if (req.user.role === "teacher" && subject) {
    const { rows: r } = await query(
      `SELECT class_id FROM homework WHERE id=$1`,
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
  await assertResourceClassMembership(req.user, "homework", req.params.id);
  await query("UPDATE homework SET deleted_at=NOW() WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});
