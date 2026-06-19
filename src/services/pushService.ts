import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { PushPlatform } from '@prisma/client';
import prisma from '../db/prisma';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:noreply@debtmate.app';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Initialise Firebase Admin once if credentials are provided
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON && getApps().length === 0) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
    initializeApp({ credential: cert(serviceAccount) });
  } catch {
    console.warn('[push] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON — FCM disabled');
  }
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
        // FCM — Android / iOS
        if (!sub.fcmToken) return;
        if (getApps().length === 0) {
          console.warn('[push] FCM not configured (FIREBASE_SERVICE_ACCOUNT_JSON missing)');
          return;
        }

        const fcmData = payload.data
          ? Object.fromEntries(Object.entries(payload.data).map(([k, v]) => [k, String(v)]))
          : undefined;

        try {
          await getMessaging().send({
            token: sub.fcmToken,
            notification: { title: payload.title, body: payload.body },
            ...(fcmData && { data: fcmData }),
            android: { priority: 'high' },
            apns: { payload: { aps: { sound: 'default' } } },
          });
        } catch (err: unknown) {
          const code = (err as { errorInfo?: { code?: string } }).errorInfo?.code;
          if (code === 'messaging/registration-token-not-registered') {
            await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          }
        }
      }
    }),
  );
}
