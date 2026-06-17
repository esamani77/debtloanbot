import { MailtrapClient } from "mailtrap";
import { Resend } from "resend";

interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

type MailDriver = "mailtrap" | "brevo" | "resend" | "console";

function resolveDriver(): MailDriver {
  const driver = process.env.MAIL_DRIVER as MailDriver | undefined;
  if (driver === "mailtrap" || driver === "brevo" || driver === "resend") return driver;
  return "console";
}

async function sendViaBrevo(options: MailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  type FetchResult = { ok: boolean; status: number; text(): Promise<string> };
  const response = (await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_FROM_NAME ?? "DebtMate",
        email: process.env.BREVO_FROM_EMAIL ?? "no-reply@debtmate.ir",
      },
      to: [{ email: options.to }],
      subject: options.subject,
      textContent: options.text,
      ...(options.html ? { htmlContent: options.html } : {}),
    }),
  })) as unknown as FetchResult;

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }
}

async function sendViaMailtrap(options: MailOptions): Promise<void> {
  const token = process.env.MAILTRAP_TOKEN;
  if (!token) throw new Error("MAILTRAP_TOKEN is not set");

  const client = new MailtrapClient({ token });
  await client.send({
    from: {
      email: process.env.MAILTRAP_FROM_EMAIL ?? "hello@debtmate.app",
      name: process.env.MAILTRAP_FROM_NAME ?? "DebtMate",
    },
    to: [{ email: options.to }],
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
  });
}

async function sendViaResend(options: MailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM ?? "DebtMate <noreply@debtmate.app>",
    to: [options.to],
    subject: options.subject,
    text: options.text,
    ...(options.html ? { html: options.html } : {}),
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}

function welcomeHtml(name: string, botLink: string): string {
  const features: string[] = [
    "Track debts and loans with friends",
    "Split bills across any group",
    "Get reminders and settle with one tap",
    "Connect your Telegram for instant updates",
  ];

  const featureRows = features
    .map(
      (f) => `
        <tr>
          <td valign="top" style="padding:0 0 10px 0;width:22px">
            <span style="display:inline-block;width:18px;height:18px;background:#e07855;border-radius:50%;text-align:center;line-height:18px;font-size:11px;font-weight:700;color:#ffffff">✓</span>
          </td>
          <td style="padding:0 0 10px 8px;font-size:14px;color:#7a9e90;line-height:1.5">${f}</td>
        </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Welcome to DebtMate</title>
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
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px">Welcome aboard, ${name}!</h1>
        </td></tr>

        <!-- subtitle -->
        <tr><td align="center" style="padding:0 40px 28px">
          <p style="margin:0;font-size:14px;color:#7a9e90;line-height:1.65">
            Your account is ready. Here's what you can do with DebtMate.
          </p>
        </td></tr>

        <!-- feature list -->
        <tr><td style="padding:0 40px 28px">
          <table cellpadding="0" cellspacing="0" role="presentation" width="100%">
            ${featureRows}
          </table>
        </td></tr>

        <!-- CTA button -->
        <tr><td align="center" style="padding:0 40px 34px">
          <a href="${botLink}" style="display:inline-block;background:#e07855;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:0.1px">Open Telegram Bot</a>
        </td></tr>

        <!-- divider -->
        <tr><td style="padding:0 40px">
          <div style="height:1px;background:#1e2d28;font-size:0;line-height:0">&nbsp;</div>
        </td></tr>

        <!-- footer -->
        <tr><td align="center" style="padding:24px 40px 32px">
          <p style="margin:0;font-size:12px;color:#3a5448;line-height:1.7">
            You received this because you created a DebtMate account.<br>
            &copy; ${new Date().getFullYear()} DebtMate &middot; <a href="https://debtmate.ir" style="color:#4d7060;text-decoration:none">debtmate.ir</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function notificationHtml(title: string, body: string, appLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${title}</title>
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
          <h1 style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.4px">${title}</h1>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 28px">
          <p style="margin:0;font-size:15px;color:#7a9e90;line-height:1.65">${body}</p>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 34px">
          <a href="${appLink}" style="display:inline-block;background:#e07855;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:0.1px">Open DebtMate</a>
        </td></tr>
        <tr><td style="padding:0 40px"><div style="height:1px;background:#1e2d28;font-size:0;line-height:0">&nbsp;</div></td></tr>
        <tr><td align="center" style="padding:24px 40px 32px">
          <p style="margin:0;font-size:12px;color:#3a5448;line-height:1.7">
            &copy; ${new Date().getFullYear()} DebtMate &middot; <a href="https://debtmate.ir" style="color:#4d7060;text-decoration:none">debtmate.ir</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendNotificationMail(to: string, title: string, body: string): Promise<void> {
  const appLink = process.env.APP_URL ?? 'https://debtmate.ir';
  await sendMail({
    to,
    subject: title,
    text: `${body}\n\nOpen DebtMate: ${appLink}`,
    html: notificationHtml(title, body, appLink),
  });
}

export async function sendWelcomeMail(to: string, name: string): Promise<void> {
  const botUsername = process.env.BOT_USERNAME ?? '';
  const botLink = botUsername ? `https://t.me/${botUsername}` : 'https://debtmate.ir';

  await sendMail({
    to,
    subject: 'Welcome to DebtMate!',
    text: `Hi ${name},\n\nWelcome to DebtMate! Track debts, split bills, and settle up easily.\n\nOpen the Telegram bot: ${botLink}\n\n— The DebtMate Team`,
    html: welcomeHtml(name, botLink),
  });
}

export async function sendMail(options: MailOptions): Promise<void> {
  const driver = resolveDriver();
  switch (driver) {
    case "mailtrap":
      await sendViaMailtrap(options);
      break;
    case "brevo":
      await sendViaBrevo(options);
      break;
    case "resend":
      await sendViaResend(options);
      break;
    default:
      console.log(
        `[MAIL DEV] To: ${options.to} | Subject: ${options.subject}\n${options.text}`,
      );
  }
}
