import { Router } from 'express';
import { requireWebAuth } from '../middleware/auth';
import {
  sendOtp,
  register,
  login,
  refresh,
  logout,
  googleVerify,
  connectTelegramInit,
  connectTelegramStatus,
} from '../controllers/authController';

const router = Router();

router.post('/otp/send', sendOtp);
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/google/verify', googleVerify);

router.post('/connect/telegram/init', requireWebAuth, connectTelegramInit);
router.get('/connect/telegram/status', requireWebAuth, connectTelegramStatus);

export default router;
