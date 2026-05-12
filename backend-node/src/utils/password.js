// ════════════════════════════════════════════════════════════════
//  bcrypt password hashing
// ════════════════════════════════════════════════════════════════
import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export const hashPassword = (plain) => bcrypt.hash(plain, ROUNDS);
export const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);
