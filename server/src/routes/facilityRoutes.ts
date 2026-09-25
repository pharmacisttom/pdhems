import { Router } from 'express';
import { FacilityController } from '../controllers/facilityController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', FacilityController.getAll);
router.get('/:id', FacilityController.getById);

// Admin-only management endpoints
router.post(
  '/',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'REFER_CENTER', 'DISPATCHER'),
  FacilityController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'REFER_CENTER', 'DISPATCHER'),
  FacilityController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN'),
  FacilityController.delete
);

export default router;
