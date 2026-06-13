type SmsDriver = "sms-ir" | "kavenegar" | "twilio" | "console";

function resolveDriver(): SmsDriver {
  const driver = process.env.SMS_DRIVER as SmsDriver | undefined;
  if (
    driver === "sms-ir" ||
    driver === "kavenegar" ||
    driver === "twilio"
  )
    return driver;
  return "console";
}

async function sendViaSmsIr(phone: string, code: string): Promise<void> {
  const apiKey = process.env.SMS_IR_API_KEY;
  const templateId = process.env.SMS_IR_TEMPLATE_ID;
  if (!apiKey) throw new Error("SMS_IR_API_KEY is not set");
  if (!templateId) throw new Error("SMS_IR_TEMPLATE_ID is not set");

  type FetchResult = { ok: boolean; status: number; text(): Promise<string> };
  const response = (await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      mobile: phone,
      templateId: Number(templateId),
      parameters: [{ name: "Code", value: code }],
    }),
  })) as unknown as FetchResult;

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`SMS.ir API error ${response.status}: ${body}`);
  }
}

async function sendViaKavenegar(phone: string, code: string): Promise<void> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  const template = process.env.KAVENEGAR_TEMPLATE;
  if (!apiKey) throw new Error("KAVENEGAR_API_KEY is not set");
  if (!template) throw new Error("KAVENEGAR_TEMPLATE is not set");

  const url = new URL(
    `https://api.kavenegar.com/v1/${apiKey}/verify/lookup.json`,
  );
  url.searchParams.set("receptor", phone);
  url.searchParams.set("template", template);
  url.searchParams.set("token", code);

  type FetchResult = { ok: boolean; status: number; text(): Promise<string> };
  const response = (await fetch(url.toString())) as unknown as FetchResult;

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kavenegar API error ${response.status}: ${body}`);
  }
}

async function sendViaTwilio(phone: string, code: string): Promise<void> {
  const sid = process.env.TWILIO_SID;
  if (!sid) throw new Error("TWILIO_SID is not set");

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const twilio = require("twilio");
  const client = twilio(sid, process.env.TWILIO_TOKEN);
  await client.messages.create({
    body: `Your DebtMate verification code: ${code}. Expires in 10 minutes.`,
    from: process.env.TWILIO_FROM,
    to: phone,
  });
}

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const driver = resolveDriver();
  switch (driver) {
    case "sms-ir":
      await sendViaSmsIr(phone, code);
      break;
    case "kavenegar":
      await sendViaKavenegar(phone, code);
      break;
    case "twilio":
      await sendViaTwilio(phone, code);
      break;
    default:
      console.log(`[OTP DEV] Phone OTP for ${phone}: ${code}`);
  }
}
