import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { getMe } from '../controllers/meController';
import { listContacts, getContactBalance, getContactLogs } from '../controllers/contactsController';
import { createTransaction } from '../controllers/transactionsController';
import { patchRelationshipCurrency } from '../controllers/relationshipsController';

const router = Router();

// All /api routes require Telegram initData auth
router.use(requireAuth);

router.get('/me', getMe);

router.get('/contacts', listContacts);
router.get('/contacts/:id/balance', getContactBalance);
router.get('/contacts/:id/logs', getContactLogs);

router.post('/transactions', createTransaction);

router.patch('/relationships/:id/currency', patchRelationshipCurrency);

export default router;
