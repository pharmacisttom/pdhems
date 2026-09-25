import { Router } from 'express';
import { BaseController } from '../controllers/baseController';
import { authenticate, authorizeRoles } from '../middleware/auth';

const router = Router();

router.get('/', BaseController.getAll);
router.get('/:id', BaseController.getById);

router.post(
  '/',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'DISPATCHER'),
  BaseController.create
);

router.put(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'DISPATCHER'),
  BaseController.update
);

router.delete(
  '/:id',
  authenticate,
  authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN'),
  BaseController.delete
);

export default router;
