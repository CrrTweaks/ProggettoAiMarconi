// Controller calendario: aggrega compiti, verifiche, interrogazioni e lezioni
import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/error.js";

/**
 * GET /calendar/events?from=YYYY-MM-DD&to=YYYY-MM-DD&class_id=...
 * Restituisce una lista unificata di eventi tra compiti, verifiche, interrogazioni e lezioni.
 */
export const events = asyncHandler(async (req, res) => {
  const { from, to, class_id } = req.query;
  const fromDate =
    from || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const toDate =
    to || new Date(Date.now() + 60 * 86400_000).toISOString().slice(0, 10);
  const userId = req.user.id;

  const params = [userId, fromDate, toDate];
  const classFilter = class_id ? " AND c.id = $4" : "";
  if (class_id) params.push(class_id);

  // Limita alle classi dell utente corrente o a quelle che possiede, salvo admin
  const userClasses =
    req.user.role === "admin"
      ? `(SELECT id FROM classes WHERE deleted_at IS NULL AND $1::uuid=$1::uuid${class_id ? " AND id=$4" : ""})`
      : `(SELECT c.id FROM classes c
        LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
        WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL)${classFilter})`;

  const sql = `
    SELECT 'homework'::text AS type, h.id, h.title, h.subject, h.priority,
           h.due_date::timestamptz AS start_at, NULL::timestamptz AS end_at,
           h.class_id, h.description AS body
      FROM homework h
     WHERE h.class_id IN ${userClasses}
       AND h.due_date BETWEEN $2 AND $3 AND h.deleted_at IS NULL
    UNION ALL
    SELECT 'exam'::text, e.id, e.title, e.subject, NULL::smallint,
           e.scheduled_for, e.scheduled_for + (e.duration_min || ' minutes')::interval,
           e.class_id, e.description
      FROM exams e
     WHERE e.class_id IN ${userClasses}
       AND e.scheduled_for::date BETWEEN $2 AND $3
    UNION ALL
    SELECT 'interrogation'::text, i.id, COALESCE(i.subject,'Interrogazione'), i.subject, NULL,
           i.scheduled_for, i.scheduled_for,
           i.class_id, i.topic
      FROM interrogations i
     WHERE i.class_id IN ${userClasses}
       AND i.scheduled_for::date BETWEEN $2 AND $3
    UNION ALL
    SELECT 'lesson'::text, l.id, l.title, NULL, NULL,
           l.taught_on::timestamptz, l.taught_on::timestamptz,
           l.class_id, l.topic
      FROM lessons l
     WHERE l.class_id IN ${userClasses}
       AND l.taught_on BETWEEN $2 AND $3
    ORDER BY start_at ASC`;

  const { rows } = await query(sql, params);
  res.json({ events: rows });
});

/** GET /calendar/workload?week_start=YYYY-MM-DD */
export const workload = asyncHandler(async (req, res) => {
  const start = req.query.week_start || new Date().toISOString().slice(0, 10);
  const userId = req.user.id;

  const userClasses = req.user.role === "admin"
    ? `(SELECT id FROM classes WHERE deleted_at IS NULL AND $1::uuid=$1::uuid)`
    : `(SELECT c.id FROM classes c
       LEFT JOIN class_members m ON m.class_id=c.id AND m.user_id=$1
       WHERE c.deleted_at IS NULL AND (c.owner_id=$1 OR m.user_id IS NOT NULL))`;

  const { rows } = await query(
    `WITH days AS (
       SELECT generate_series(0,6) AS d
     )
     SELECT (date $2 + d) AS day,
            (SELECT COUNT(*) FROM homework h
              WHERE h.class_id IN ${userClasses}
                AND h.due_date = date $2 + d AND h.deleted_at IS NULL) AS homework,
            (SELECT COUNT(*) FROM exams e
              WHERE e.class_id IN ${userClasses}
                AND e.scheduled_for::date = date $2 + d) AS exams,
            (SELECT COUNT(*) FROM interrogations i
              WHERE i.class_id IN ${userClasses}
                AND i.scheduled_for::date = date $2 + d) AS interrogations
       FROM days
     ORDER BY day`,
    [userId, start],
  );
  res.json({ week_start: start, days: rows });
});
