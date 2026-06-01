import { Router } from 'express';
import {
  listSessions,
  createSession,
  getSession,
  addBill,
  calculate,
  removeSplitSession,
  updateSession,
  replaceSessionBills,
  joinSplitSession,
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
router.post('/:id/calculate', calculate);

export default router;
