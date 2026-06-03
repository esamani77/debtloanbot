import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/authService';
import { findOrCreateUser, findUserById } from '../services/userService';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

function validateInitData(initDataRaw: string, botToken: string): TelegramUser | null {
  try {
    const params = new URLSearchParams(initDataRaw);
    const hash = params.get('hash');
    if (!hash) return null;

    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const expectedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (expectedHash !== hash) return null;

    const authDate = Number(params.get('auth_date'));
    if (Date.now() / 1000 - authDate > 86400) return null;

    const userJson = params.get('user');
    if (!userJson) return null;

    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization ?? '';

  if (authHeader.startsWith('tma ')) {
    const BOT_TOKEN = process.env.BOT_TOKEN;
    if (!BOT_TOKEN) {
      res.status(500).json({ error: 'Server misconfiguration.' });
      return;
    }

    const tgUser = validateInitData(authHeader.slice(4), BOT_TOKEN);
    if (!tgUser) {
      res.status(401).json({ error: 'Invalid or expired Telegram initData.' });
      return;
    }

    const name = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : '');
    const user = await findOrCreateUser(String(tgUser.id), name, tgUser.username);

    res.locals.userId = user.id;
    res.locals.telegramId = String(tgUser.id);
    res.locals.telegramName = name;
    res.locals.telegramUsername = tgUser.username ?? undefined;
    next();
    return;
  }

  if (authHeader.startsWith('Bearer ')) {
    try {
      const { userId } = verifyAccessToken(authHeader.slice(7));
      const user = await findUserById(userId);
      if (!user) {
        res.status(401).json({ error: 'User not found.' });
        return;
      }
      res.locals.userId = userId;
      next();
      return;
    } catch {
      res.status(401).json({ error: 'Invalid or expired access token.' });
      return;
    }
  }

  res.status(401).json({ error: 'Missing Authorization header.' });
}

// Narrower middleware for auth-only routes that require a Bearer token (web auth only)
export async function requireWebAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Bearer token required.' });
    return;
  }

  try {
    const { userId } = verifyAccessToken(authHeader.slice(7));
    const user = await findUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found.' });
      return;
    }
    res.locals.userId = userId;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token.' });
  }
}
