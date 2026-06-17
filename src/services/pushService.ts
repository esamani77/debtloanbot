import webpush from 'web-push';
import { PushPlatform } from '@prisma/client';
import prisma from '../db/prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:noreply@debtmate.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  await Promise.all(
    subs.map(async (sub) => {
      if (sub.platform === PushPlatform.WEB) {
        if (!sub.endpoint || !sub.p256dh || !sub.auth) return;
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            JSON.stringify(payload),
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number }).statusCode;
          if (status === 410 || status === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      } else {
        // FCM/APNs — stub until Firebase Admin SDK is configured
        if (sub.fcmToken) {
          console.warn('[push] FCM not configured — skipping token', sub.fcmToken.slice(0, 10));
        }
      }
    }),
  );
}
