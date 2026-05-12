import { Router } from 'express';
import { createTransaction } from '../controllers/transactionsController';

const router = Router();

router.post('/', createTransaction);

export default router;
