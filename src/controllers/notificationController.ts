import { Request, Response } from 'express';
import prisma from '../db/prisma';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const limit = Math.min(Number(typeof req.query.limit === 'string' ? req.query.limit : undefined) || 20, 50);
  const before = typeof req.query.before === 'string' ? req.query.before : undefined;

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    res.json(notifications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  try {
    const count = await prisma.notification.count({ where: { userId, read: false } });
    res.json({ count });
  } catch {
    res.status(500).json({ error: 'Failed to fetch unread count.' });
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  const id = String(req.params.id);

  try {
    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== userId) {
      res.status(404).json({ error: 'Notification not found.' });
      return;
    }
    await prisma.notification.update({ where: { id }, data: { read: true } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  const userId = res.locals.userId as string;
  try {
    await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
}
