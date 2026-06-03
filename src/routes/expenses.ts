import { Router } from 'express';
import {
  listExpenses,
  createExpenseHandler,
  getExpenseStatsHandler,
  getExpenseHandler,
  updateExpenseHandler,
  deleteExpenseHandler,
  linkTransactionHandler,
  unlinkTransactionHandler,
} from '../controllers/expenseController';

const router = Router();

router.get('/', listExpenses);
router.post('/', createExpenseHandler);
router.get('/stats', getExpenseStatsHandler);
router.get('/:id', getExpenseHandler);
router.patch('/:id', updateExpenseHandler);
router.delete('/:id', deleteExpenseHandler);
router.patch('/:id/link', linkTransactionHandler);
router.delete('/:id/link', unlinkTransactionHandler);

export default router;
