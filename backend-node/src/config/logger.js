// ════════════════════════════════════════════════════════════════
//  Pino logger (pretty in dev, JSON in prod)
// ════════════════════════════════════════════════════════════════
import pino from 'pino';
import { env } from './env.js';

const isProd = env.NODE_ENV === 'production';

export const logger = pino({
  level: isProd ? 'info' : 'debug',
  customLevels: { http: 25 },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});
