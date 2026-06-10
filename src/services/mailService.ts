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
