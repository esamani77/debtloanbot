import { Request, Response } from 'express';
import { Theme } from '@prisma/client';
import { findOrCreateUser, setNickname, getDisplayName, setUserTheme } from '../services/userService';

const VALID_THEMES = Object.values(Theme);

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const user = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    res.json({
      id: user.id,
      telegramId: user.telegramId,
      name: user.name,
      nickname: user.nickname,
      displayName: getDisplayName(user),
      language: user.language,
      theme: user.theme,
      createdAt: user.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to fetch user.' });
  }
}

export async function patchNickname(req: Request, res: Response): Promise<void> {
  const { nickname } = req.body as { nickname?: unknown };

  if (nickname !== null && nickname !== undefined && typeof nickname !== 'string') {
    res.status(400).json({ error: 'nickname must be a string or null.' });
    return;
  }

  const trimmed = typeof nickname === 'string' ? nickname.trim() : null;

  if (typeof trimmed === 'string' && trimmed.length === 0) {
    res.status(400).json({ error: 'nickname cannot be empty.' });
    return;
  }

  try {
    const user = await setNickname(res.locals.telegramId, trimmed);
    res.json({
      nickname: user.nickname,
      displayName: getDisplayName(user),
    });
  } catch {
    res.status(500).json({ error: 'Failed to update nickname.' });
  }
}

export async function getTheme(req: Request, res: Response): Promise<void> {
  try {
    const user = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    res.json({ theme: user.theme });
  } catch {
    res.status(500).json({ error: 'Failed to fetch theme.' });
  }
}

export async function patchTheme(req: Request, res: Response): Promise<void> {
  const { theme } = req.body as { theme?: unknown };

  if (!theme || typeof theme !== 'string' || !VALID_THEMES.includes(theme as Theme)) {
    res.status(400).json({ error: `theme must be one of: ${VALID_THEMES.join(', ')}.` });
    return;
  }

  try {
    const user = await setUserTheme(res.locals.telegramId, theme as Theme);
    res.json({ theme: user.theme });
  } catch {
    res.status(500).json({ error: 'Failed to update theme.' });
  }
}
