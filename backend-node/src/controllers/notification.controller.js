// Controller notifiche
import { query } from "../config/db.js";
import { asyncHandler } from "../middleware/error.js";
import { emitToUser } from "../services/socket.js";

export const list = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT * FROM notifications
     WHERE user_id=$1
     ORDER BY created_at DESC LIMIT 100`,
    [req.user.id],
  );
  res.json({ notifications: rows });
});

export const unreadCount = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS count FROM notifications
     WHERE user_id=$1 AND read_at IS NULL`,
    [req.user.id],
  );
  res.json({ count: rows[0].count });
});

export const markRead = asyncHandler(async (req, res) => {
  await query(
    `UPDATE notifications SET read_at=NOW()
     WHERE user_id=$1 AND id=$2`,
    [req.user.id, req.params.id],
  );
  res.json({ ok: true });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await query(
    `UPDATE notifications SET read_at=NOW()
     WHERE user_id=$1 AND read_at IS NULL`,
    [req.user.id],
  );
  res.json({ ok: true });
});

/** Helper interno usato altrove: crea una notifica e la invia tramite socket */
export const pushNotification = async (userId, payload) => {
  const { type = "system", title, body = "", data = {} } = payload;
  const { rows } = await query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [userId, type, title, body, data],
  );
  try {
    emitToUser(userId, "notification:new", rows[0]);
  } catch {}
  return rows[0];
};
