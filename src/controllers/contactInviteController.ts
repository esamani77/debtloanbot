import { Request, Response } from "express";
import prisma from "../db/prisma";
import { getDisplayName, findUserById } from "../services/userService";
import { getOrCreateRelationship } from "../services/relationshipService";
import { sendMail } from "../services/mailService";
import { sendOtpSms } from "../services/smsService";
import { generateUniqueWebInviteToken } from "../utils/webInviteToken";

const WEB_URL = process.env.WEB_URL ?? "https://debtmate.ir";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

async function getOrCreateInvite(userId: string) {
  const existing = await prisma.webContactInvite.findUnique({ where: { inviterId: userId } });
  if (existing) return existing;
  const token = await generateUniqueWebInviteToken();
  return prisma.webContactInvite.create({ data: { token, inviterId: userId } });
}

function inviteHtml(inviterName: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>You have been invited to DebtMate</title>
</head>
<body style="margin:0;padding:0;background:#0d1412;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;width:100%;background:#141f1b;border:1px solid #243028;border-radius:20px;overflow:hidden">
        <tr><td height="4" style="background:#e07855;font-size:0;line-height:0">&nbsp;</td></tr>
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
        <tr><td align="center" style="padding:28px 40px 10px">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px">${inviterName} invited you!</h1>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 28px">
          <p style="margin:0;font-size:14px;color:#7a9e90;line-height:1.65">
            Accept to connect with <strong style="color:#c8dfd5">${inviterName}</strong> on DebtMate and start tracking debts together.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 34px">
          <a href="${inviteLink}" style="display:inline-block;background:#e07855;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:0.1px">Accept Invitation</a>
        </td></tr>
        <tr><td style="padding:0 40px">
          <div style="height:1px;background:#1e2d28;font-size:0;line-height:0">&nbsp;</div>
        </td></tr>
        <tr><td align="center" style="padding:24px 40px 32px">
          <p style="margin:0;font-size:12px;color:#3a5448;line-height:1.7">
            You received this because ${inviterName} invited you to DebtMate.<br>
            &copy; ${new Date().getFullYear()} DebtMate &middot; <a href="https://debtmate.ir" style="color:#4d7060;text-decoration:none">debtmate.ir</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function getOrCreateMyInvite(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const invite = await getOrCreateInvite(userId);
  res.json({ token: invite.token, inviteLink: `${WEB_URL}/en/v/${invite.token}` });
}

export async function sendInviteByContact(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const { type, target } = req.body as { type?: string; target?: string };

  if (type !== "email" && type !== "sms") {
    res.status(400).json({ error: "type must be 'email' or 'sms'" });
    return;
  }
  if (!target) {
    res.status(400).json({ error: "target is required" });
    return;
  }
  if (type === "email" && !EMAIL_REGEX.test(target)) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  if (type === "sms" && !PHONE_REGEX.test(target)) {
    res.status(400).json({ error: "Invalid phone number (must be E.164 format, e.g. +14155552671)" });
    return;
  }

  const [invite, user] = await Promise.all([
    getOrCreateInvite(userId),
    findUserById(userId),
  ]);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const inviterName = getDisplayName(user);
  const inviteLink = `${WEB_URL}/en/v/${invite.token}`;

  try {
    if (type === "email") {
      await sendMail({
        to: target,
        subject: `${inviterName} invited you to DebtMate`,
        text: `${inviterName} invited you to DebtMate! Accept the invitation to connect and track debts together: ${inviteLink}`,
        html: inviteHtml(inviterName, inviteLink),
      });
    } else {
      // SMS.ir / Kavenegar require pre-registered templates — use OTP fallback or console
      // For Twilio, reuse sendOtpSms with the link as the "code" value (free-text body)
      await sendOtpSms(target, inviteLink);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error("[contactInvite] Failed to send invite:", err);
    res.status(500).json({ error: "Failed to send invite" });
  }
}

export async function getInviteInfo(req: Request, res: Response): Promise<void> {
  const token = req.params.token as string;
  const invite = await prisma.webContactInvite.findUnique({
    where: { token },
    include: { inviter: true },
  });
  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  res.json({ inviterName: getDisplayName(invite.inviter) });
}

export async function acceptInvite(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const token = req.params.token as string;

  const invite = await prisma.webContactInvite.findUnique({ where: { token } });
  if (!invite) {
    res.status(404).json({ error: "Invite not found" });
    return;
  }
  if (invite.inviterId === userId) {
    res.status(400).json({ error: "Cannot accept your own invite" });
    return;
  }

  const { created } = await getOrCreateRelationship(userId, invite.inviterId);
  res.json({ ok: true, created });
}
