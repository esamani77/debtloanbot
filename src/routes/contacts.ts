import { Router } from 'express';
import { listContacts, getContactBalance, getContactLogs, settleAllTransactions } from '../controllers/contactsController';
import { getContactBankAccounts } from '../controllers/bankAccountsController';

const router = Router();

router.get('/', listContacts);
router.get('/:id/balance', getContactBalance);
router.get('/:id/logs', getContactLogs);
router.get('/:id/bank-accounts', getContactBankAccounts);
router.post('/:id/settle-all', settleAllTransactions);

export default router;
