import crypto from "crypto";
import { OtpType } from "@prisma/client";
import prisma from "../db/prisma";
import { sendMail } from "./mailService";

const OTP_TTL_MINUTES = 10;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

function generateCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

function otpEmailHtml(code: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:40px;max-width:480px">
        <tr><td align="center" style="padding-bottom:24px">
          <span style="font-size:26px;font-weight:700;color:#111">DebtMate</span>
        </td></tr>
        <tr><td style="font-size:16px;color:#333;padding-bottom:8px;font-weight:600">
          Verify your email address
        </td></tr>
        <tr><td style="font-size:15px;color:#555;padding-bottom:24px">
          Enter this code to complete verification. It expires in ${OTP_TTL_MINUTES} minutes.
        </td></tr>
        <tr><td align="center" style="padding-bottom:24px">
          <div style="background:#f4f4f4;border-radius:10px;padding:18px 32px;font-size:36px;font-weight:700;letter-spacing:10px;color:#111;display:inline-block">${code}</div>
        </td></tr>
        <tr><td style="font-size:13px;color:#999;border-top:1px solid #eee;padding-top:20px">
          If you didn't request this, you can safely ignore this email.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmailOtp(email: string): Promise<void> {
  await checkResendCooldown(email, OtpType.EMAIL_REGISTRATION);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { target: email, code, type: OtpType.EMAIL_REGISTRATION, expiresAt },
  });

  await sendMail({
    to: email,
    subject: "Your DebtMate verification code",
    text: `Your verification code is: ${code}\n\nIt expires in ${OTP_TTL_MINUTES} minutes.`,
    html: otpEmailHtml(code),
  });
}

export async function sendPhoneOtp(phone: string): Promise<void> {
  await checkResendCooldown(phone, OtpType.PHONE_REGISTRATION);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.otpCode.create({
    data: { target: phone, code, type: OtpType.PHONE_REGISTRATION, expiresAt },
  });

  const twilioSid = process.env.TWILIO_SID;
  if (twilioSid) {
    const twilio = require("twilio");
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

export async function verifyOtp(
  target: string,
  code: string,
  type: OtpType,
): Promise<void> {
  const record = await prisma.otpCode.findFirst({
    where: { target, type, used: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.code !== code) {
    throw new Error("Invalid or expired OTP.");
  }

  await prisma.otpCode.update({
    where: { id: record.id },
    data: { used: true },
  });
}

async function checkResendCooldown(
  target: string,
  type: OtpType,
): Promise<void> {
  const recent = await prisma.otpCode.findFirst({
    where: {
      target,
      type,
      createdAt: {
        gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000),
      },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new Error(
      `Please wait ${OTP_RESEND_COOLDOWN_SECONDS} seconds before requesting a new code.`,
    );
  }
}
