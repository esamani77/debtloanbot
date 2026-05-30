import { Router } from 'express';
import { getMe, patchNickname, getTheme, patchTheme } from '../controllers/meController';
import {
  listMyBankAccounts,
  createBankAccount,
  updateBankAccountHandler,
  deleteBankAccountHandler,
} from '../controllers/bankAccountsController';

const router = Router();

router.get('/', getMe);
router.patch('/nickname', patchNickname);
router.get('/theme', getTheme);
router.patch('/theme', patchTheme);
router.get('/bank-accounts', listMyBankAccounts);
router.post('/bank-accounts', createBankAccount);
router.put('/bank-accounts/:id', updateBankAccountHandler);
router.delete('/bank-accounts/:id', deleteBankAccountHandler);

export default router;
