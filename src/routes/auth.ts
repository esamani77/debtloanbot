import { Router } from 'express';
import { requireWebAuth } from '../middleware/auth';
import { verifyCaptcha } from '../middleware/recaptcha';
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
  sendForgotPasswordOtp,
  resetPassword,
} from '../controllers/authController';

const router = Router();

router.post('/otp/send', verifyCaptcha, sendOtp);
router.post('/register', verifyCaptcha, register);
router.post('/login', verifyCaptcha, login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/google/verify', googleVerify);

router.post('/connect/telegram/init', requireWebAuth, connectTelegramInit);
router.get('/connect/telegram/status', requireWebAuth, connectTelegramStatus);

router.post('/connect/email/send-otp', requireWebAuth, sendConnectEmailOtp);
router.post('/connect/email/verify', requireWebAuth, verifyEmailConnect);
router.post('/connect/phone/send-otp', requireWebAuth, sendConnectPhoneOtp);
router.post('/connect/phone/verify', requireWebAuth, verifyPhoneConnect);

router.post('/forgot-password/send-otp', verifyCaptcha, sendForgotPasswordOtp);
router.post('/forgot-password/reset', resetPassword);

export default router;
