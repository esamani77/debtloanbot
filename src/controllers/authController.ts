import { Request, Response } from "express";
import { OtpType } from "@prisma/client";
import { sendEmailOtp, sendPhoneOtp } from "../services/otpService";
import {
  registerWithEmail,
  registerWithPhone,
  loginWithEmail,
  loginWithPhone,
  refreshAccessToken,
  revokeSession,
  initTelegramConnect,
} from "../services/authService";
import { findUserById } from "../services/userService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/;

export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { target, type } = req.body as { target?: string; type?: string };

  if (!target || typeof target !== "string") {
    res.status(400).json({ error: "target is required." });
    return;
  }
  if (type !== "email" && type !== "phone") {
    res.status(400).json({ error: 'type must be "email" or "phone".' });
    return;
  }

  if (type === "email" && !EMAIL_REGEX.test(target)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }
  if (type === "phone" && !PHONE_REGEX.test(target)) {
    res.status(400).json({
      error: "Invalid phone number. Use E.164 format (e.g. +989121234567).",
    });
    return;
  }

  try {
    if (type === "email") {
      await sendEmailOtp(target);
    } else {
      await sendPhoneOtp(target);
    }
    res.json({ message: "OTP sent. Expires in 10 minutes." });
  } catch (err) {
    console.log("Error sending OTP:", err);
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Please wait")) {
      res.status(429).json({ error: msg });
      return;
    }
    res.status(500).json({ error: "Failed to send OTP." });
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { method, target, password, otp } = req.body as {
    method?: string;
    target?: string;
    password?: string;
    otp?: string;
  };

  if (method !== "email" && method !== "phone") {
    res.status(400).json({ error: 'method must be "email" or "phone".' });
    return;
  }
  if (!target || !password || !otp) {
    res.status(400).json({ error: "target, password, and otp are required." });
    return;
  }
  if (typeof password !== "string" || password.length < 8) {
    res.status(400).json({ error: "password must be at least 8 characters." });
    return;
  }
  if (method === "email" && !EMAIL_REGEX.test(target)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }
  if (method === "phone" && !PHONE_REGEX.test(target)) {
    res.status(400).json({ error: "Invalid phone number. Use E.164 format." });
    return;
  }

  try {
    const result =
      method === "email"
        ? await registerWithEmail(target, password, otp)
        : await registerWithPhone(target, password, otp);

    res.status(201).json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "EMAIL_TAKEN" || msg === "PHONE_TAKEN") {
      res
        .status(409)
        .json({ error: "An account with this email/phone already exists." });
      return;
    }
    if (msg === "Invalid or expired OTP.") {
      res.status(422).json({ error: msg });
      return;
    }
    res.status(500).json({ error: "Registration failed." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { method, target, password } = req.body as {
    method?: string;
    target?: string;
    password?: string;
  };

  if (method !== "email" && method !== "phone") {
    res.status(400).json({ error: 'method must be "email" or "phone".' });
    return;
  }
  if (!target || !password) {
    res.status(400).json({ error: "target and password are required." });
    return;
  }

  try {
    const result =
      method === "email"
        ? await loginWithEmail(target, password)
        : await loginWithPhone(target, password);

    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "INVALID_CREDENTIALS") {
      res.status(401).json({ error: "Invalid credentials." });
      return;
    }
    if (msg === "EMAIL_NOT_VERIFIED" || msg === "PHONE_NOT_VERIFIED") {
      res.status(403).json({
        error: "Account not verified. Please complete OTP verification.",
      });
      return;
    }
    res.status(500).json({ error: "Login failed." });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required." });
    return;
  }

  try {
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch {
    res.status(401).json({ error: "Invalid or expired refresh token." });
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (!refreshToken || typeof refreshToken !== "string") {
    res.status(400).json({ error: "refreshToken is required." });
    return;
  }

  await revokeSession(refreshToken);
  res.json({ message: "Logged out." });
}

export async function connectTelegramInit(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await initTelegramConnect(res.locals.userId as string);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("BOT_USERNAME")) {
      res
        .status(500)
        .json({ error: "Server misconfiguration: BOT_USERNAME not set." });
      return;
    }
    res.status(500).json({ error: "Failed to generate connect link." });
  }
}

export async function connectTelegramStatus(
  req: Request,
  res: Response,
): Promise<void> {
  const user = await findUserById(res.locals.userId as string);
  if (!user) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  if (user.telegramId) {
    res.json({
      connected: true,
      telegramId: user.telegramId,
      telegramUsername: user.username ?? null,
    });
  } else {
    res.json({ connected: false });
  }
}
