import { Router } from 'express';
import { registerWebPush, unregisterWebPush, registerFcmToken } from '../controllers/pushController';

const router = Router();

router.post('/web', registerWebPush);
router.delete('/web', unregisterWebPush);
router.post('/token', registerFcmToken);

export default router;
