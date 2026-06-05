import nodemailer from "nodemailer";
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
  const login = process.env.BREVO_SMTP_LOGIN;
  const apiKey = process.env.BREVO_API_KEY;
  if (!login) throw new Error("BREVO_SMTP_LOGIN is not set");
  if (!apiKey) throw new Error("BREVO_API_KEY is not set");

  const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user: login, pass: apiKey },
  });
  await transporter.sendMail({
    from: process.env.BREVO_FROM ?? "noreply@debtmate.app",
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
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
