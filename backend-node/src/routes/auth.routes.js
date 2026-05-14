// Route autenticazione: registrazione, login, refresh, logout e profilo
import { Router } from "express";
import { body } from "express-validator";
import rateLimit from "express-rate-limit";

import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import * as ctl from "../controllers/auth.controller.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  message: { error: "Troppi tentativi di autenticazione, riprova più tardi" },
});

router.post(
  "/register",
  authLimiter,
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().isLength({ min: 8 }),
    body("full_name").isString().trim().isLength({ min: 2, max: 150 }),
    body("role").optional().isIn(["student", "teacher", "admin"]),
  ]),
  ctl.register,
);

router.post(
  "/login",
  authLimiter,
  validate([
    body("email").isEmail().normalizeEmail(),
    body("password").isString().notEmpty(),
  ]),
  ctl.login,
);

router.post("/refresh", ctl.refresh);
router.post("/logout", ctl.logout);
router.get("/me", requireAuth, ctl.me);

export default router;
