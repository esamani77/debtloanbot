import { Router } from 'express';
import { createTransaction, updateTransaction, deleteTransaction, settleTransaction } from '../controllers/transactionsController';

const router = Router();

router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.patch('/:id/settle', settleTransaction);
router.delete('/:id', deleteTransaction);

export default router;
