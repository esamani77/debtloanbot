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
  sendConnectEmailOtp,
  verifyEmailConnect,
  sendConnectPhoneOtp,
  verifyPhoneConnect,
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

router.post('/connect/email/send-otp', requireWebAuth, sendConnectEmailOtp);
router.post('/connect/email/verify', requireWebAuth, verifyEmailConnect);
router.post('/connect/phone/send-otp', requireWebAuth, sendConnectPhoneOtp);
router.post('/connect/phone/verify', requireWebAuth, verifyPhoneConnect);

export default router;
