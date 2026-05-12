// ════════════════════════════════════════════════════════════════
//  JWT helpers (access + refresh tokens)
// ════════════════════════════════════════════════════════════════
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const signAccessToken = (user) =>
  jwt.sign(
    { sub: user.id, email: user.email, role: user.role, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES }
  );

export const signRefreshToken = (user) =>
  jwt.sign(
    { sub: user.id, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES }
  );

export const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (payload.type !== 'access') throw new Error('Invalid token type');
  return payload;
};

export const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, env.JWT_REFRESH_SECRET);
  if (payload.type !== 'refresh') throw new Error('Invalid token type');
  return payload;
};
