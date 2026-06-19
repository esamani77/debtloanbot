import { Router } from 'express';
import {
  listSessions,
  createSession,
  getSession,
  addBill,
  updateBill,
  deleteBill,
  calculate,
  removeSplitSession,
  updateSession,
  replaceSessionBills,
  joinSplitSession,
  togglePublic,
  lockSplit,
} from '../controllers/splitController';

const router = Router();

router.get('/', listSessions);
router.post('/', createSession);
router.post('/join/:token', joinSplitSession);
router.get('/:id', getSession);
router.patch('/:id', updateSession);
router.delete('/:id', removeSplitSession);
router.post('/:id/bills', addBill);
router.put('/:id/bills', replaceSessionBills);
router.patch('/:id/bills/:billId', updateBill);
router.delete('/:id/bills/:billId', deleteBill);
router.post('/:id/calculate', calculate);
router.patch('/:id/public', togglePublic);
router.post('/:id/lock', lockSplit);

export default router;
