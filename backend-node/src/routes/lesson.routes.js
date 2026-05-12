// ════════════════════════════════════════════════════════════════
//  /lessons · CRUD (teachers/admin)
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctl from '../controllers/lesson.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctl.list);

router.post('/',
  requireRole('teacher', 'admin'),
  validate([
    body('class_id').isUUID(),
    body('title').isString().trim().notEmpty(),
    body('taught_on').isISO8601(),
  ]),
  ctl.create
);

router.put   ('/:id', requireRole('teacher', 'admin'), ctl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctl.remove);

export default router;
