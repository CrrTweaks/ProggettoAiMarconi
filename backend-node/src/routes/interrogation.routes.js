// Route interrogazioni: CRUD
import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as ctl from "../controllers/interrogation.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", ctl.list);

router.post(
  "/",
  requireRole("teacher", "admin"),
  validate([
    body("class_id").isUUID(),
    body("scheduled_for").isISO8601(),
    body("student_id").optional().isUUID(),
    body("subject").optional().isString(),
    body("topic").optional().isString(),
  ]),
  ctl.create,
);

router.put("/:id", requireRole("teacher", "admin"), ctl.update);
router.delete("/:id", requireRole("teacher", "admin"), ctl.remove);

export default router;
