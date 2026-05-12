// ════════════════════════════════════════════════════════════════
//  express-validator wrapper
// ════════════════════════════════════════════════════════════════
import { validationResult } from 'express-validator';
import { HttpError } from './error.js';

/** Run a list of validators and short-circuit with 422 on errors. */
export const validate = (validations) => async (req, _res, next) => {
  for (const v of validations) await v.run(req);
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return next(new HttpError(422, 'Validation failed', errors.array()));
};
