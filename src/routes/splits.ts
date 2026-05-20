import { Router } from 'express';
import {
  listSessions,
  createSession,
  getSession,
  addBill,
  calculate,
  removeSplitSession,
} from '../controllers/splitController';

const router = Router();

router.get('/', listSessions);
router.post('/', createSession);
router.get('/:id', getSession);
router.post('/:id/bills', addBill);
router.post('/:id/calculate', calculate);
router.delete('/:id', removeSplitSession);

export default router;
