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
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to DebtMate</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: #1a1a2e; padding: 36px 40px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; color: #a0a0c0; font-size: 14px; }
    .body { padding: 36px 40px; }
    .body p { margin: 0 0 16px; color: #444; font-size: 15px; line-height: 1.6; }
    .features { list-style: none; margin: 0 0 28px; padding: 0; }
    .features li { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 12px; color: #444; font-size: 15px; }
    .features li::before { content: "✓"; color: #6c63ff; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
    .cta { display: block; text-align: center; background: #6c63ff; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 0 0 28px; }
    .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
    .footer { padding: 20px 40px; text-align: center; background: #fafafa; }
    .footer p { margin: 0; color: #aaa; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Welcome to DebtMate 👋</h1>
      <p>Your personal debt tracker</p>
    </div>
    <div class="body">
      <p>Hi <strong>${name}</strong>,</p>
      <p>You're all set! DebtMate helps you track shared expenses, split bills, and settle up — without the awkwardness.</p>
      <ul class="features">
        <li>Track debts and loans with friends</li>
        <li>Split bills across any group</li>
        <li>Get reminders and settle with one tap</li>
        <li>Use the Telegram bot for instant updates</li>
      </ul>
      <a href="${botLink}" class="cta">Open the Telegram Bot</a>
      <hr class="divider" />
      <p style="font-size:13px; color:#888;">You can also access DebtMate directly from Telegram. Connect your account in the app settings any time.</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} DebtMate · <a href="https://debtmate.ir" style="color:#6c63ff; text-decoration:none;">debtmate.ir</a></p>
      <p>You received this because you signed up for a DebtMate account.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendWelcomeMail(to: string, name: string): Promise<void> {
  const botUsername = process.env.BOT_USERNAME ?? '';
  const botLink = botUsername ? `https://t.me/${botUsername}` : 'https://debtmate.ir';

  await sendMail({
    to,
    subject: 'Welcome to DebtMate!',
    text: `Hi ${name},\n\nWelcome to DebtMate! Track debts, split bills, and settle up easily.\n\nOpen the Telegram bot: ${botLink}\n\n— The DebtMate Team`,
    html: welcomeHtml(name, botLink),
  }).catch((err) => {
    console.error('[MAIL] Failed to send welcome email:', err);
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
