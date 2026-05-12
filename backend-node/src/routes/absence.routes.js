// ════════════════════════════════════════════════════════════════
//  /absences · CRUD
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctl from '../controllers/absence.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/', ctl.list);

router.post('/',
  requireRole('teacher', 'admin'),
  validate([
    body('user_id').isUUID(),
    body('date').isISO8601(),
    body('hours').optional().isInt({ min: 1, max: 8 }),
    body('justified').optional().isBoolean(),
  ]),
  ctl.create
);

router.put   ('/:id', requireRole('teacher', 'admin'), ctl.update);
router.delete('/:id', requireRole('teacher', 'admin'), ctl.remove);

export default router;
