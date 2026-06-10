import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { OtpType } from '@prisma/client';
import prisma from '../db/prisma';
import { verifyOtp } from './otpService';

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES ?? '15m';
const REFRESH_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS ?? '30', 10);
const BCRYPT_ROUNDS = 10;

function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET environment variable is required.');
  return s;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export async function generateTokens(userId: string): Promise<TokenPair> {
  const expiresIn = parseExpiresInSeconds(ACCESS_EXPIRES);
  const accessToken = jwt.sign({ userId }, jwtSecret(), { expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({ data: { userId, refreshToken, expiresAt } });

  return { accessToken, refreshToken, expiresIn };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const session = await prisma.session.findUnique({ where: { refreshToken } });

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { refreshToken } });
    throw new Error('Invalid or expired refresh token.');
  }

  const expiresIn = parseExpiresInSeconds(ACCESS_EXPIRES);
  const accessToken = jwt.sign({ userId: session.userId }, jwtSecret(), { expiresIn: ACCESS_EXPIRES as jwt.SignOptions['expiresIn'] });

  return { accessToken, expiresIn };
}

export async function revokeSession(refreshToken: string): Promise<void> {
  await prisma.session.deleteMany({ where: { refreshToken } });
}

export async function registerWithEmail(email: string, password: string, otp: string): Promise<TokenPair & { user: { id: string; name: string; email: string } }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('EMAIL_TAKEN');

  await verifyOtp(email, otp, OtpType.EMAIL_REGISTRATION);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const name = email.split('@')[0];

  const user = await prisma.user.create({ data: { email, passwordHash, name, emailVerified: true } });
  const tokens = await generateTokens(user.id);

  return { ...tokens, user: { id: user.id, name: user.name, email: user.email! } };
}

export async function registerWithPhone(phone: string, password: string, otp: string): Promise<TokenPair & { user: { id: string; name: string; phone: string } }> {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) throw new Error('PHONE_TAKEN');

  await verifyOtp(phone, otp, OtpType.PHONE_REGISTRATION);

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const name = phone;

  const user = await prisma.user.create({ data: { phone, passwordHash, name, phoneVerified: true } });
  const tokens = await generateTokens(user.id);

  return { ...tokens, user: { id: user.id, name: user.name, phone: user.phone! } };
}

export async function loginWithEmail(email: string, password: string): Promise<TokenPair & { user: { id: string; name: string; email: string } }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS');
  if (!user.emailVerified) throw new Error('EMAIL_NOT_VERIFIED');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const tokens = await generateTokens(user.id);
  return { ...tokens, user: { id: user.id, name: user.name, email: user.email! } };
}

export async function loginWithPhone(phone: string, password: string): Promise<TokenPair & { user: { id: string; name: string; phone: string } }> {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS');
  if (!user.phoneVerified) throw new Error('PHONE_NOT_VERIFIED');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const tokens = await generateTokens(user.id);
  return { ...tokens, user: { id: user.id, name: user.name, phone: user.phone! } };
}

export async function loginWithGoogle(idToken: string): Promise<TokenPair & { user: { id: string; name: string; email: string } }> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID not set');

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('INVALID_TOKEN');

  const googleId = payload.sub;
  const email = payload.email ?? '';
  const name = payload.name ?? email.split('@')[0] ?? 'User';

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user && email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) {
      user = await prisma.user.update({
        where: { id: byEmail.id },
        data: { googleId, emailVerified: true },
      });
    }
  }

  if (!user) {
    user = await prisma.user.create({
      data: { googleId, email: email || undefined, name, emailVerified: !!email },
    });
  }

  const tokens = await generateTokens(user.id);
  return { ...tokens, user: { id: user.id, name: user.name, email: user.email ?? '' } };
}

export async function initTelegramConnect(userId: string): Promise<{ deepLink: string; token: string; expiresAt: Date }> {
  const botUsername = process.env.BOT_USERNAME;
  if (!botUsername) throw new Error('BOT_USERNAME environment variable is required.');

  await prisma.telegramConnectToken.deleteMany({ where: { userId, used: false } });

  const token = crypto.randomBytes(20).toString('hex');
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.telegramConnectToken.create({ data: { userId, token, expiresAt } });

  const deepLink = `https://t.me/${botUsername}?start=connect_${token}`;
  return { deepLink, token, expiresAt };
}

export async function completeTelegramConnect(token: string, telegramId: string, telegramName: string): Promise<{ success: boolean; message: string }> {
  const record = await prisma.telegramConnectToken.findUnique({ where: { token } });

  if (!record || record.used || record.expiresAt < new Date()) {
    return { success: false, message: 'This link is invalid or has expired.' };
  }

  const existingWithTelegram = await prisma.user.findUnique({ where: { telegramId } });
  if (existingWithTelegram && existingWithTelegram.id !== record.userId) {
    return { success: false, message: 'This Telegram account is already linked to another DebtMate account.' };
  }

  const currentUser = await prisma.user.findUnique({ where: { id: record.userId } });
  if (currentUser?.telegramId) {
    await prisma.telegramConnectToken.update({ where: { token }, data: { used: true } });
    return { success: false, message: 'Your account is already connected to a Telegram account.' };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { telegramId, name: telegramName } }),
    prisma.telegramConnectToken.update({ where: { token }, data: { used: true } }),
  ]);

  return { success: true, message: 'Your Telegram account has been connected successfully!' };
}

export async function connectEmail(userId: string, email: string, otp: string): Promise<void> {
  await verifyOtp(email, otp, OtpType.EMAIL_CONNECT);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== userId) {
    throw new Error('This email is already associated with another account.');
  }

  await prisma.user.update({ where: { id: userId }, data: { email, emailVerified: true } });
}

export async function connectPhone(userId: string, phone: string, otp: string): Promise<void> {
  await verifyOtp(phone, otp, OtpType.PHONE_CONNECT);

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing && existing.id !== userId) {
    throw new Error('This phone number is already associated with another account.');
  }

  await prisma.user.update({ where: { id: userId }, data: { phone, phoneVerified: true } });
}

export function verifyAccessToken(token: string): { userId: string } {
  const payload = jwt.verify(token, jwtSecret()) as { userId: string };
  return { userId: payload.userId };
}

function parseExpiresInSeconds(value: string): number {
  if (value.endsWith('m')) return parseInt(value) * 60;
  if (value.endsWith('h')) return parseInt(value) * 3600;
  if (value.endsWith('d')) return parseInt(value) * 86400;
  return parseInt(value);
}
