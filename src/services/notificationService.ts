import { NotificationType } from '@prisma/client';
import prisma from '../db/prisma';
import { sendPushToUser } from './pushService';
import { sendNotificationMail } from './mailService';
import { bot } from '../bot';

export { NotificationType };

export interface NotifyData {
  transactionId?: string;
  splitId?: string;
  contactId?: string;
  [key: string]: unknown;
}

/**
 * Creates a DB notification and fans out to all available channels:
 * Telegram (if telegramId set), email (if email verified), and push subscriptions.
 *
 * @param telegramMsg - Optional Telegram-specific message (supports Markdown).
 *   Falls back to `body` when not provided.
 * @param telegramExtra - Optional Telegraf sendMessage extra options (e.g. reply_markup).
 */
export async function createAndNotify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: NotifyData,
  telegramMsg?: string,
  telegramExtra?: Record<string, unknown>,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, telegramId: true, email: true, emailVerified: true },
  });
  if (!user) return;

  await Promise.all([
    // 1. Persist in-app notification
    prisma.notification.create({
      data: { userId, type, title, body, data: (data ?? {}) as object },
    }).catch((err) => { console.error('[notify] DB create failed:', err?.message ?? err); }),

    // 2. Telegram
    user.telegramId
      ? bot.telegram.sendMessage(
          user.telegramId,
          telegramMsg ?? body,
          { parse_mode: 'Markdown', ...(telegramExtra ?? {}) } as Parameters<typeof bot.telegram.sendMessage>[2],
        ).catch(() => {})
      : Promise.resolve(),

    // 3. Email (verified addresses only)
    user.email && user.emailVerified
      ? sendNotificationMail(user.email, title, body).catch(() => {})
      : Promise.resolve(),

    // 4. Push (web + FCM)
    sendPushToUser(userId, { title, body, data }).catch(() => {}),
  ]);
}
