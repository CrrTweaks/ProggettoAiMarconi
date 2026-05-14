// Route utenti: profilo e elenco per admin
import { Router } from "express";
import { body } from "express-validator";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as ctl from "../controllers/user.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", requireRole("admin", "teacher"), ctl.list);
router.get("/me", (req, res, next) => {
  req.params.id = req.user.id;
  ctl.getById(req, res, next);
});
router.put(
  "/me",
  validate([
    body("full_name")
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 150 }),
    body("avatar_url").optional().isURL(),
    body("bio").optional().isString().isLength({ max: 1000 }),
    body("preferences").optional().isObject(),
  ]),
  ctl.updateMe,
);
router.delete("/me", ctl.removeMe);
router.get("/:id", requireRole("admin", "teacher"), ctl.getById);

export default router;
