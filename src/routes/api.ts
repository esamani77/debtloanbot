import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import meRouter from './me';
import contactsRouter from './contacts';
import transactionsRouter from './transactions';
import relationshipsRouter from './relationships';
import splitsRouter from './splits';
import recurringRouter from './recurring';
import expensesRouter from './expenses';
import expenseCategoriesRouter from './expenseCategories';
import notificationsRouter from './notifications';
import pushRouter from './push';

const router = Router();

router.use(requireAuth);

router.use('/me', meRouter);
router.use('/contacts', contactsRouter);
router.use('/transactions', transactionsRouter);
router.use('/relationships', relationshipsRouter);
router.use('/splits', splitsRouter);
router.use('/recurring', recurringRouter);
router.use('/expenses', expensesRouter);
router.use('/expense-categories', expenseCategoriesRouter);
router.use('/notifications', notificationsRouter);
router.use('/push', pushRouter);

export default router;
