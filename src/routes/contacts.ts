import { Router } from 'express';
import { listContacts, getContactBalance, getContactLogs } from '../controllers/contactsController';
import { getContactBankAccounts } from '../controllers/bankAccountsController';

const router = Router();

router.get('/', listContacts);
router.get('/:id/balance', getContactBalance);
router.get('/:id/logs', getContactLogs);
router.get('/:id/bank-accounts', getContactBankAccounts);

export default router;
