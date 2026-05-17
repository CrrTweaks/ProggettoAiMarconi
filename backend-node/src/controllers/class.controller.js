// Controller classi
import { query, withTransaction } from "../config/db.js";
import { HttpError, asyncHandler } from "../middleware/error.js";

export const list = asyncHandler(async (req, res) => {
  const isPriv = req.user.role === "admin";
  const { rows } = isPriv
    ? await query(
        `SELECT c.* FROM classes c
         WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC`,
      )
    : req.user.role === "teacher"
      ? await query(
          `SELECT DISTINCT c.* FROM classes c
           JOIN schedules s ON s.class_id = c.id
           WHERE c.deleted_at IS NULL AND s.teacher_id = $1
           ORDER BY c.created_at DESC`,
          [req.user.id],
        )
      : await query(
          `SELECT c.* FROM classes c
           LEFT JOIN class_members m ON m.class_id = c.id AND m.user_id = $1
           WHERE c.deleted_at IS NULL AND (c.owner_id = $1 OR m.user_id IS NOT NULL)
           ORDER BY c.created_at DESC`,
          [req.user.id],
        );
  res.json({ classes: rows });
});

export const getById = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM classes WHERE id=$1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Classe non trovata");

  const { rows: members } = await query(
    `SELECT u.id, u.full_name, u.email, u.avatar_url, m.role, m.joined_at
     FROM class_members m JOIN users u ON u.id = m.user_id
     WHERE m.class_id=$1 ORDER BY m.joined_at`,
    [req.params.id],
  );
  const { rows: schedule } = await query(
    `SELECT * FROM schedules WHERE class_id=$1 ORDER BY weekday, start_time`,
    [req.params.id],
  );

  // Contatori risorse collegate
  const { rows: counts } = await query(
    `SELECT
       (SELECT COUNT(*) FROM homework WHERE class_id=$1 AND deleted_at IS NULL) AS homework_count,
       (SELECT COUNT(*) FROM lessons WHERE class_id=$1) AS lessons_count,
       (SELECT COUNT(*) FROM exams WHERE class_id=$1) AS exams_count,
       (SELECT COUNT(*) FROM interrogations WHERE class_id=$1) AS interrogations_count`,
    [req.params.id],
  );

  res.json({
    class: rows[0],
    members,
    schedule,
    counts: counts[0],
  });
});

export const create = asyncHandler(async (req, res) => {
  const { name, description, school_year, subject, color } = req.body;
  const { rows } = await withTransaction(async (c) => {
    const r = await c.query(
      `INSERT INTO classes (name, description, school_year, subject, color, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [
        name,
        description || null,
        school_year,
        subject || null,
        color || "#3b82f6",
        req.user.id,
      ],
    );
    await c.query(
      `INSERT INTO class_members (class_id, user_id, role) VALUES ($1,$2,'teacher')`,
      [r.rows[0].id, req.user.id],
    );
    return r;
  });
  res.status(201).json({ class: rows[0] });
});

export const update = asyncHandler(async (req, res) => {
  const { name, description, school_year, subject, color } = req.body;
  const { rows } = await query(
    `UPDATE classes SET
       name        = COALESCE($1, name),
       description = COALESCE($2, description),
       school_year = COALESCE($3, school_year),
       subject     = COALESCE($4, subject),
       color       = COALESCE($5, color)
     WHERE id=$6 AND deleted_at IS NULL
     RETURNING *`,
    [name, description, school_year, subject, color, req.params.id],
  );
  if (!rows[0]) throw new HttpError(404, "Classe non trovata");
  res.json({ class: rows[0] });
});

export const remove = asyncHandler(async (req, res) => {
  await query("UPDATE classes SET deleted_at=NOW() WHERE id=$1", [
    req.params.id,
  ]);
  res.json({ ok: true });
});

export const addMember = asyncHandler(async (req, res) => {
  const { user_id, role = "student" } = req.body;
  await query(
    `INSERT INTO class_members (class_id, user_id, role)
     VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
    [req.params.id, user_id, role],
  );
  res.status(201).json({ ok: true });
});

export const removeMember = asyncHandler(async (req, res) => {
  await query(`DELETE FROM class_members WHERE class_id=$1 AND user_id=$2`, [
    req.params.id,
    req.params.userId,
  ]);
  res.json({ ok: true });
});
