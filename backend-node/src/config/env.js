// ════════════════════════════════════════════════════════════════
//  Environment loader (validated)
// ════════════════════════════════════════════════════════════════
import 'dotenv/config';

const required = (key, fallback = undefined) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined || v === '') {
    // Allow missing values during dev with a warning, instead of crashing —
    // certain features (Supabase) become no-ops if not configured.
    console.warn(`[env] missing ${key}`);
  }
  return v;
};

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  HOST:     process.env.NODE_HOST || '0.0.0.0',
  PORT:     parseInt(process.env.NODE_PORT || '4000', 10),

  CORS_ORIGIN:     process.env.CORS_ORIGIN     || 'http://localhost:5173',
  AI_SERVICE_URL:  process.env.AI_SERVICE_URL  || 'http://localhost:8000',

  // Database
  DATABASE_URL:    required('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/aischool'),

  // Supabase (optional - we mainly use direct PG)
  SUPABASE_URL:              process.env.SUPABASE_URL              || '',
  SUPABASE_ANON_KEY:         process.env.SUPABASE_ANON_KEY         || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // JWT
  JWT_ACCESS_SECRET:  process.env.JWT_ACCESS_SECRET  || 'dev-access-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',

  // Rate-limit
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX:       parseInt(process.env.RATE_LIMIT_MAX       || '200', 10),
};
