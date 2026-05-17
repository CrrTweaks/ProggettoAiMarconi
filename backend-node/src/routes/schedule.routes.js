import { Router } from "express";
import { body } from "express-validator";
import * as ctrl from "../controllers/schedule.controller.js";
import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(requireAuth);

router.get("/class/:classId", ctrl.listByClass);

router.post(
  "/",
  validate([
    body("class_id").isUUID(),
    body("weekday").optional().isInt({ min: 0, max: 6 }),
    body("start_time").optional().matches(/^\d{2}:\d{2}$/),
    body("end_time").optional().matches(/^\d{2}:\d{2}$/),
    body("subject").isString().trim().notEmpty(),
    body("room").optional().trim(),
    body("teacher_id").optional().isUUID(),
  ]),
  ctrl.create,
);

router.put(
  "/:id",
  validate([
    body("weekday").optional().isInt({ min: 0, max: 6 }),
    body("start_time").optional().matches(/^\d{2}:\d{2}$/),
    body("end_time").optional().matches(/^\d{2}:\d{2}$/),
    body("subject").isString().trim().notEmpty(),
    body("room").optional().trim(),
    body("teacher_id").optional().isUUID(),
  ]),
  ctrl.update,
);

router.delete("/:id", ctrl.remove);

export default router;
