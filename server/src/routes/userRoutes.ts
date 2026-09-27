import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authorizeRoles } from '../middleware/auth';

const router = Router();

// Only Admins / Commanders can manage users and roles
const adminOnly = authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'EMS_COMMANDER');

router.get('/roles', adminOnly, UserController.getRoles);
router.get('/', adminOnly, UserController.getUsers);
router.post('/', adminOnly, UserController.createUser);
router.put('/:id', adminOnly, UserController.updateUser);
router.post('/:id/reset-password', adminOnly, UserController.resetPassword);
router.post('/:id/toggle-status', adminOnly, UserController.toggleStatus);

export default router;
