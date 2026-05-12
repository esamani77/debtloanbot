import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import meRouter from './me';
import contactsRouter from './contacts';
import transactionsRouter from './transactions';
import relationshipsRouter from './relationships';

const router = Router();

router.use(requireAuth);

router.use('/me', meRouter);
router.use('/contacts', contactsRouter);
router.use('/transactions', transactionsRouter);
router.use('/relationships', relationshipsRouter);

export default router;
