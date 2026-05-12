import { Router } from 'express';
import { patchRelationshipCurrency } from '../controllers/relationshipsController';

const router = Router();

router.patch('/:id/currency', patchRelationshipCurrency);

export default router;
