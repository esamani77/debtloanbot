import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

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

    // Optional: reject initData older than 24 hours
    const authDate = Number(params.get('auth_date'));
    if (Date.now() / 1000 - authDate > 86400) return null;

    const userJson = params.get('user');
    if (!userJson) return null;

    return JSON.parse(userJson) as TelegramUser;
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const BOT_TOKEN = process.env.BOT_TOKEN;
  if (!BOT_TOKEN) {
    res.status(500).json({ error: 'Server misconfiguration.' });
    return;
  }

  // Expect: Authorization: tma <initDataRaw>
  const authHeader = req.headers.authorization ?? '';
  const initDataRaw = authHeader.startsWith('tma ') ? authHeader.slice(4) : null;

  if (!initDataRaw) {
    res.status(401).json({ error: 'Missing Authorization header.' });
    return;
  }

  const user = validateInitData(initDataRaw, BOT_TOKEN);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired Telegram initData.' });
    return;
  }

  res.locals.telegramId = String(user.id);
  res.locals.telegramName =
    user.first_name + (user.last_name ? ` ${user.last_name}` : '');
  res.locals.telegramUsername = user.username ?? undefined;

  next();
}
