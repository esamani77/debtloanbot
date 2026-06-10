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
  const digitCells = code
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px"><div style="width:46px;height:58px;background:#1a2922;border:1.5px solid #2e4038;border-radius:10px;font-size:28px;font-weight:700;color:#ffffff;text-align:center;line-height:58px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">${d}</div></td>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Your DebtMate verification code</title>
</head>
<body style="margin:0;padding:0;background:#0d1412;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;width:100%;background:#141f1b;border:1px solid #243028;border-radius:20px;overflow:hidden">

        <!-- top accent bar -->
        <tr><td height="4" style="background:#e07855;font-size:0;line-height:0">&nbsp;</td></tr>

        <!-- logo -->
        <tr><td align="center" style="padding:36px 40px 0">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background:#e07855;border-radius:9px;width:38px;height:38px;text-align:center;vertical-align:middle">
                <span style="font-size:19px;font-weight:800;color:#ffffff;line-height:38px;display:block">D</span>
              </td>
              <td style="padding-left:9px;vertical-align:middle">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Debt</span><span style="font-size:20px;font-weight:700;color:#e07855;letter-spacing:-0.3px">Mate</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- heading -->
        <tr><td align="center" style="padding:28px 40px 10px">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px">Verify your email address</h1>
        </td></tr>

        <!-- subtitle -->
        <tr><td align="center" style="padding:0 40px 30px">
          <p style="margin:0;font-size:14px;color:#7a9e90;line-height:1.65">
            Enter the code below in the DebtMate app to complete sign-up.
          </p>
        </td></tr>

        <!-- otp digit boxes -->
        <tr><td align="center" style="padding:0 40px 14px">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>${digitCells}</tr>
          </table>
        </td></tr>

        <!-- expiry -->
        <tr><td align="center" style="padding:0 40px 34px">
          <p style="margin:0;font-size:13px;color:#4d7060">
            Expires in <span style="color:#e07855;font-weight:600">${OTP_TTL_MINUTES}&nbsp;minutes</span>
          </p>
        </td></tr>

        <!-- divider -->
        <tr><td style="padding:0 40px">
          <div style="height:1px;background:#1e2d28;font-size:0;line-height:0">&nbsp;</div>
        </td></tr>

        <!-- footer -->
        <tr><td align="center" style="padding:24px 40px 32px">
          <p style="margin:0;font-size:12px;color:#3a5448;line-height:1.7">
            If you didn't request this code, you can safely ignore this email.<br>Your account remains secure.
          </p>
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
