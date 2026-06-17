import { Request, Response } from 'express';
import { PushPlatform } from '@prisma/client';
import prisma from '../db/prisma';

export async function registerWebPush(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const { endpoint, p256dh, auth } = req.body as {
    endpoint?: string;
    p256dh?: string;
    auth?: string;
  };

  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: 'endpoint, p256dh, and auth are required.' });
    return;
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId, endpoint } },
      create: { userId, platform: PushPlatform.WEB, endpoint, p256dh, auth },
      update: { p256dh, auth },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to register push subscription.' });
  }
}

export async function unregisterWebPush(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const { endpoint } = req.body as { endpoint?: string };

  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required.' });
    return;
  }

  try {
    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to unregister push subscription.' });
  }
}

export async function registerFcmToken(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const { token, platform } = req.body as {
    token?: string;
    platform?: string;
  };

  if (!token || (platform !== 'android' && platform !== 'ios')) {
    res.status(400).json({ error: 'token and platform ("android" | "ios") are required.' });
    return;
  }

  const pushPlatform = platform === 'android' ? PushPlatform.ANDROID : PushPlatform.IOS;

  try {
    await prisma.pushSubscription.upsert({
      where: { userId_fcmToken: { userId, fcmToken: token } },
      create: { userId, platform: pushPlatform, fcmToken: token },
      update: { platform: pushPlatform },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to register FCM token.' });
  }
}
