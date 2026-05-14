// Script di seed per fare l hash delle password demo con bcrypt
// Uso: npm run seed
import "dotenv/config";
import { pool, query } from "../config/db.js";
import { hashPassword } from "../utils/password.js";

const ACCOUNTS = [
  {
    email: "admin@school.test",
    password: "Admin123!",
    full_name: "Admin User",
    role: "admin",
  },
  {
    email: "teacher@school.test",
    password: "Teacher123!",
    full_name: "Maria Rossi",
    role: "teacher",
  },
  {
    email: "student@school.test",
    password: "Student123!",
    full_name: "Luca Bianchi",
    role: "student",
  },
];

(async () => {
  console.log("▶ Hashing passwords for demo accounts…");
  for (const acc of ACCOUNTS) {
    const hash = await hashPassword(acc.password);
    const r = await query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             full_name     = EXCLUDED.full_name,
             role          = EXCLUDED.role
       RETURNING id, email, role`,
      [acc.email, hash, acc.full_name, acc.role],
    );
    console.log(`  ✓ ${r.rows[0].email}  (${r.rows[0].role})`);
  }
  console.log("✓ Seed complete");
  await pool.end();
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
