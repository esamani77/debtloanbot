import { Router } from 'express';
import { createTransaction, updateTransaction, deleteTransaction } from '../controllers/transactionsController';

const router = Router();

router.post('/', createTransaction);
router.patch('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

export default router;
