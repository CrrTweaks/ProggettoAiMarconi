// ════════════════════════════════════════════════════════════════
//  Postgres connection pool (works with Supabase or local PG)
// ════════════════════════════════════════════════════════════════
import pg from 'pg';
import { env } from './env.js';
import { logger } from './logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_URL.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => logger.error({ err }, 'PG pool error'));

/**
 * Tagged template-friendly query helper.
 * Usage:  const { rows } = await query('SELECT * FROM users WHERE id=$1',[id])
 */
export const query = (text, params) => pool.query(text, params);

/**
 * Run a callback inside a transaction with automatic commit/rollback.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
