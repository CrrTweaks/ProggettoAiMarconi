// ════════════════════════════════════════════════════════════════
//  /calendar · aggregated events + AI workload helpers
// ════════════════════════════════════════════════════════════════
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as ctl from '../controllers/calendar.controller.js';

const router = Router();
router.use(requireAuth);

router.get('/events',   ctl.events);
router.get('/workload', ctl.workload);

export default router;
