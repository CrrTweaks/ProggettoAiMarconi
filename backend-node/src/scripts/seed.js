// Script di seed per fare l hash delle password demo con bcrypt
// Uso: npm run seed
import "dotenv/config";
import { pool, query } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

// Account demo creati da database/seed.sql.
// Questo script aggiorna le password con hash bcrypt validi.
// Vedi docs/SEED_DATA.md per la tabella completa delle credenziali.
const TEACHER_PWD = "Teacher123!";
const STUDENT_PWD = "Student123!";

const ACCOUNTS = [
  // Admin
  { email: "admin@school.test",    password: "Admin123!", full_name: "Admin School",     role: "admin"   },

  // Teachers
  { email: "rossi@school.test",    password: TEACHER_PWD, full_name: "Maria Rossi",      role: "teacher", primary_subject: "Matematica" },
  { email: "verdi@school.test",    password: TEACHER_PWD, full_name: "Giovanni Verdi",   role: "teacher", primary_subject: "Italiano" },
  { email: "bianchi@school.test",  password: TEACHER_PWD, full_name: "Anna Bianchi",     role: "teacher", primary_subject: "Fisica" },
  { email: "ferrari@school.test",  password: TEACHER_PWD, full_name: "Paolo Ferrari",    role: "teacher", primary_subject: "Storia" },
  { email: "esposito@school.test", password: TEACHER_PWD, full_name: "Lucia Esposito",   role: "teacher", primary_subject: "Inglese" },

  // Students 3A
  { email: "conti@school.test",    password: STUDENT_PWD, full_name: "Luca Conti",       role: "student" },
  { email: "romano@school.test",   password: STUDENT_PWD, full_name: "Sofia Romano",     role: "student" },
  { email: "galli@school.test",    password: STUDENT_PWD, full_name: "Marco Galli",      role: "student" },
  { email: "marini@school.test",   password: STUDENT_PWD, full_name: "Giulia Marini",    role: "student" },
  { email: "greco@school.test",    password: STUDENT_PWD, full_name: "Davide Greco",     role: "student" },

  // Students 4B
  { email: "bruno@school.test",    password: STUDENT_PWD, full_name: "Chiara Bruno",     role: "student" },
  { email: "rizzi@school.test",    password: STUDENT_PWD, full_name: "Matteo Rizzi",     role: "student" },
  { email: "fontana@school.test",  password: STUDENT_PWD, full_name: "Alessia Fontana",  role: "student" },
  { email: "caruso@school.test",   password: STUDENT_PWD, full_name: "Riccardo Caruso",  role: "student" },
  { email: "lombardi@school.test", password: STUDENT_PWD, full_name: "Martina Lombardi", role: "student" },

  // Students 5A
  { email: "moretti@school.test",  password: STUDENT_PWD, full_name: "Andrea Moretti",   role: "student" },
  { email: "barbieri@school.test", password: STUDENT_PWD, full_name: "Elena Barbieri",   role: "student" },
  { email: "mancini@school.test",  password: STUDENT_PWD, full_name: "Federico Mancini", role: "student" },
  { email: "colombo@school.test",  password: STUDENT_PWD, full_name: "Sara Colombo",     role: "student" },
  { email: "rinaldi@school.test",  password: STUDENT_PWD, full_name: "Tommaso Rinaldi",  role: "student" },
];

(async () => {
  console.log("▶ Hashing passwords for demo accounts…");
  for (const acc of ACCOUNTS) {
    const hash = await hashPassword(acc.password);
    const r = await query(
      `INSERT INTO users (email, password_hash, full_name, role, primary_subject)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE
         SET password_hash     = EXCLUDED.password_hash,
             full_name         = EXCLUDED.full_name,
             role              = EXCLUDED.role,
             primary_subject   = EXCLUDED.primary_subject
       RETURNING id, email, role`,
      [acc.email, hash, acc.full_name, acc.role, acc.primary_subject || null],
    );
    console.log(`  ✓ ${r.rows[0].email}  (${r.rows[0].role})`);
  }
  console.log("✓ Seed complete");
  await pool.end();
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
