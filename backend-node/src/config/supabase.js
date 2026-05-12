// ════════════════════════════════════════════════════════════════
//  Supabase JS client (used for Storage + realtime metadata).
//  All relational queries go through pg pool in db.js.
// ════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';
import { logger } from './logger.js';

let supabase = null;

if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  logger.info('✓ Supabase SDK initialised');
} else {
  logger.warn('Supabase SDK not configured — storage features disabled');
}

export { supabase };
