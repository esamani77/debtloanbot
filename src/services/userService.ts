import { Language, Theme, User } from '@prisma/client';
import prisma from '../db/prisma';

export function getDisplayName(user: { name: string; nickname: string | null }): string {
  return user.nickname ?? user.name;
}

/**
 * Finds an existing user by telegramId or creates a new one.
 */
export async function findOrCreateUser(telegramId: string, name: string): Promise<User> {
  const existing = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (existing) {
    // Update name if it has changed
    if (existing.name !== name) {
      return prisma.user.update({
        where: { telegramId },
        data: { name },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      telegramId,
      name,
    },
  });
}

/**
 * Finds a user by their Telegram ID.
 */
export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { telegramId },
  });
}

/**
 * Finds a user by their internal database ID.
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { id },
  });
}

/**
 * Sets a custom nickname for a user. Pass null to clear (revert to Telegram name).
 */
export async function setNickname(telegramId: string, nickname: string | null): Promise<User> {
  return prisma.user.update({
    where: { telegramId },
    data: { nickname },
  });
}

/**
 * Updates the language preference for a user.
 */
export async function setUserLanguage(
  telegramId: string,
  language: Language
): Promise<User> {
  return prisma.user.update({
    where: { telegramId },
    data: { language },
  });
}

export async function setUserTheme(telegramId: string, theme: Theme): Promise<User> {
  return prisma.user.update({
    where: { telegramId },
    data: { theme },
  });
}
