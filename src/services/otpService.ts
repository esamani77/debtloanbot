import crypto from 'crypto';
import { OtpType } from '@prisma/client';
import prisma from '../db/prisma';

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendEmailOtp(email: string): Promise<void> {
  await checkResendCooldown(email, OtpType.EMAIL_REGISTRATION);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { target: email, code, type: OtpType.EMAIL_REGISTRATION, expiresAt } });

  const smtpHost = process.env.SMTP_HOST;
  if (smtpHost) {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
    await transporter.sendMail({
      from: process.env.SMTP_FROM ?? 'noreply@debtmate.app',
      to: email,
      subject: 'Your DebtMate verification code',
      text: `Your verification code is: ${code}\n\nIt expires in ${OTP_TTL_MINUTES} minutes.`,
    });
  } else {
    console.log(`[OTP DEV] Email OTP for ${email}: ${code}`);
  }
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  await checkResendCooldown(phone, OtpType.PHONE_REGISTRATION);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({ data: { target: phone, code, type: OtpType.PHONE_REGISTRATION, expiresAt } });

  const twilioSid = process.env.TWILIO_SID;
  if (twilioSid) {
    const twilio = require('twilio');
    const client = twilio(twilioSid, process.env.TWILIO_TOKEN);
    await client.messages.create({
      body: `Your DebtMate verification code: ${code}. Expires in ${OTP_TTL_MINUTES} minutes.`,
      from: process.env.TWILIO_FROM,
      to: phone,
    });
  } else {
    console.log(`[OTP DEV] Phone OTP for ${phone}: ${code}`);
  }
}

export async function verifyOtp(target: string, code: string, type: OtpType): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: { target, type, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'desc' },
  });

  if (!record || record.code !== code) {
    throw new Error('Invalid or expired OTP.');
  }

  await prisma.otpCode.update({ where: { id: record.id }, data: { used: true } });
}

async function checkResendCooldown(target: string, type: OtpType): Promise<void> {
  const recent = await prisma.otpCode.findFirst({
    where: {
      target,
      type,
      createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (recent) {
    throw new Error(`Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new code.`);
  }
}
