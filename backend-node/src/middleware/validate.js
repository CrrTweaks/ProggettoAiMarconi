// Wrapper per express validator
import { validationResult } from "express-validator";
import { HttpError } from "./error.js";

/** Esegue una lista di validatori e restituisce 422 in caso di errori. */
export const validate = (validations) => async (req, _res, next) => {
  for (const v of validations) await v.run(req);
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return next(new HttpError(422, "Validation failed", errors.array()));
};
