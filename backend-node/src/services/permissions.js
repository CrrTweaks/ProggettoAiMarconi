// Helper per controlli di autorizzazione basati sulla membership di classe.
// Gli admin saltano sempre il controllo (hanno accesso pieno).
// I teacher e gli student devono comparire in `class_members` (oppure essere
// owner della classe) per poter operare sulle risorse di quella classe.
import { query } from "../config/db.js";
import { HttpError } from "../middleware/error.js";

/**
 * Verifica che l'utente abbia accesso alla classe indicata.
 * - Admin: sempre OK.
 * - Altri ruoli: devono essere owner della classe oppure presenti in
 *   `class_members`. Se `requiredRole` e' specificato (es. 'teacher'),
 *   la riga in `class_members` deve avere quel ruolo.
 *
 * Lancia HttpError 403 se la verifica fallisce, 404 se la classe non esiste.
 */
export async function assertClassMembership(
  user,
  classId,
  { requiredRole } = {},
) {
  if (!classId) throw new HttpError(400, "class_id mancante");
  if (user?.role === "admin") return;

  const { rows } = await query(
    `SELECT c.id,
            c.owner_id,
            m.role AS membership_role
     FROM classes c
     LEFT JOIN class_members m
       ON m.class_id = c.id AND m.user_id = $2
     WHERE c.id = $1 AND c.deleted_at IS NULL`,
    [classId, user.id],
  );

  const row = rows[0];
  if (!row) throw new HttpError(404, "Classe non trovata");

  const isOwner = row.owner_id === user.id;
  const hasMembership = !!row.membership_role;

  if (!isOwner && !hasMembership) {
    throw new HttpError(
      403,
      "Non sei assegnato a questa classe. Chiedi all'amministratore di aggiungerti.",
    );
  }

  if (
    requiredRole &&
    !isOwner &&
    row.membership_role !== requiredRole &&
    user.role !== requiredRole
  ) {
    throw new HttpError(
      403,
      `Operazione riservata al ruolo "${requiredRole}" sulla classe.`,
    );
  }
}

/**
 * Variante che ricava il class_id da una risorsa esistente (homework,
 * lessons, exams, interrogations) tramite la sua tabella e id.
 */
export async function assertResourceClassMembership(
  user,
  table,
  resourceId,
  opts,
) {
  // Whitelist tabelle per evitare SQL injection sull'identificatore.
  const allowed = ["homework", "lessons", "exams", "interrogations"];
  if (!allowed.includes(table)) {
    throw new HttpError(500, "Tabella non autorizzata");
  }
  const { rows } = await query(
    `SELECT class_id FROM ${table} WHERE id = $1`,
    [resourceId],
  );
  if (!rows[0]) throw new HttpError(404, "Risorsa non trovata");
  await assertClassMembership(user, rows[0].class_id, opts);
}
