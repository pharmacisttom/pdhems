import { Router } from 'express';
import { ExpenseController } from '../controllers/expenseController';
import { authorizeRoles } from '../middleware/auth';

const router = Router();

// Staff, Dispatchers, and Admins can view/record expenses
router.get('/', ExpenseController.getExpenses);
router.post('/', ExpenseController.createExpense);
router.put('/:id', ExpenseController.updateExpense);
router.delete('/:id', authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'EMS_COMMANDER'), ExpenseController.deleteExpense);
router.get('/audit/logs', authorizeRoles('SUPER_ADMIN', 'EMS_ADMIN', 'EMS_COMMANDER', 'DISPATCHER'), ExpenseController.getAuditLogs);

export default router;
