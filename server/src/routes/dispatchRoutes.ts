import { Router } from 'express';
import { dispatchController } from '../controllers/dispatchController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// MAP-5: Find Nearest Ambulances with Road distance & Freshness scoring
router.post('/nearest-ambulances', dispatchController.findNearestAmbulances);

// MAP-5 & Phase 7: Emergency Quick Dispatch
router.post('/quick-emergency', dispatchController.quickDispatch);

export default router;
