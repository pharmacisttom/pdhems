import { Router } from 'express';
import { AmbulanceController } from '../controllers/ambulanceController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', AmbulanceController.getAll);
router.put('/:id/location', AmbulanceController.updateLocation);

export default router;
