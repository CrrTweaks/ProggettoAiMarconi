// Calendario scolastico: festività, ponti e giorni non lavorativi.
// Usato per impedire la programmazione di compiti/lezioni/verifiche/interrogazioni
// nei weekend e nei giorni festivi.

// Ogni voce: { from, to, name } — date in formato YYYY-MM-DD inclusivo.
export const HOLIDAYS = [
  { from: "2025-11-01", to: "2025-11-01", name: "Tutti i Santi" },
  { from: "2025-12-08", to: "2025-12-08", name: "Immacolata Concezione" },
  { from: "2025-12-23", to: "2026-01-06", name: "Vacanze di Natale" },
  { from: "2026-02-16", to: "2026-02-17", name: "Ponte / Carnevale" },
  { from: "2026-04-02", to: "2026-04-07", name: "Vacanze di Pasqua" },
  { from: "2026-04-25", to: "2026-04-25", name: "Festa della Liberazione" },
  { from: "2026-05-01", to: "2026-05-01", name: "Festa del Lavoro" },
  { from: "2026-06-02", to: "2026-06-02", name: "Festa della Repubblica" },
];

/**
 * Estrae la porzione YYYY-MM-DD da:
 *  - una stringa "YYYY-MM-DD"
 *  - una stringa "YYYY-MM-DDTHH:mm"
 *  - un Date
 */
function toYmd(value) {
  if (!value) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "string") {
    return value.length >= 10 ? value.slice(0, 10) : null;
  }
  return null;
}

/**
 * Restituisce il motivo per cui un giorno non è scolastico, oppure null
 * se è un normale giorno di scuola.
 */
export function getNonSchoolReason(dateLike) {
  const ymd = toYmd(dateLike);
  if (!ymd) return null;
  // Calcoliamo il giorno della settimana costruendo un Date locale.
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0 = dom, 6 = sab
  if (dow === 0) return "Domenica · giorno non scolastico";
  if (dow === 6) return "Sabato · giorno non scolastico (settimana corta)";
  for (const h of HOLIDAYS) {
    if (ymd >= h.from && ymd <= h.to) return h.name;
  }
  return null;
}

export function isSchoolDay(dateLike) {
  return getNonSchoolReason(dateLike) === null;
}

/**
 * Restituisce il prossimo giorno scolastico a partire da `from` (incluso).
 * Mantiene l'ora se `from` è un Date.
 */
export function nextSchoolDay(from = new Date()) {
  const base = from instanceof Date ? new Date(from) : new Date();
  // massimo 60 iterazioni di sicurezza (es. vacanze di Natale lunghe)
  for (let i = 0; i < 60; i++) {
    if (isSchoolDay(base)) return base;
    base.setDate(base.getDate() + 1);
  }
  return base;
}
