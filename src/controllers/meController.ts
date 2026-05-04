import { Request, Response } from 'express';
import { findOrCreateUser } from '../services/userService';

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    res.json({
      id: user.id,
      telegramId: user.telegramId,
      name: user.name,
      language: user.language,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
}
