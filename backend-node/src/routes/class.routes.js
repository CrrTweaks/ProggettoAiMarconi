// Route classi: CRUD e membri
import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as ctl from "../controllers/class.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", ctl.list);
router.get("/:id", ctl.getById);

// Solo admin puo' creare/eliminare classi e gestire membri.
// I docenti possono modificare i metadati (descrizione/colore) della loro classe.
router.post(
  "/",
  requireRole("admin"),
  validate([
    body("name").isString().trim().notEmpty(),
    body("school_year").isString().trim().notEmpty(),
    body("subject").optional().isString(),
    body("description").optional().isString(),
    body("color").optional().isString(),
  ]),
  ctl.create,
);

router.put("/:id", requireRole("teacher", "admin"), ctl.update);

router.delete("/:id", requireRole("admin"), ctl.remove);

router.post("/:id/members", requireRole("admin"), ctl.addMember);
router.delete(
  "/:id/members/:userId",
  requireRole("admin"),
  ctl.removeMember,
);

export default router;
