// Route notifiche
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as ctl from "../controllers/notification.controller.js";

const router = Router();
router.use(requireAuth);

router.get("/", ctl.list);
router.get("/unread-count", ctl.unreadCount);
router.post("/:id/read", ctl.markRead);
router.post("/read-all", ctl.markAllRead);

export default router;
