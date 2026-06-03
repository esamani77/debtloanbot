import { Language, Theme, User } from '@prisma/client';
import prisma from '../db/prisma';

export function getDisplayName(user: { name: string; nickname: string | null }): string {
  return user.nickname ?? user.name;
}

export async function findOrCreateUser(telegramId: string, name: string, username?: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { telegramId } });

  if (existing) {
    const nameChanged = existing.name !== name;
    const usernameChanged = username !== undefined && existing.username !== username;
    if (nameChanged || usernameChanged) {
      return prisma.user.update({
        where: { telegramId },
        data: {
          ...(nameChanged ? { name } : {}),
          ...(usernameChanged ? { username } : {}),
        },
      });
    }
    return existing;
  }

  return prisma.user.create({
    data: {
      telegramId,
      name,
      ...(username ? { username } : {}),
    },
  });
}

export async function findUserByTelegramId(telegramId: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { telegramId } });
}

export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export async function setNickname(userId: string, nickname: string | null): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { nickname } });
}

export async function setUserLanguage(userId: string, language: Language): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { language } });
}

export async function setUserTheme(userId: string, theme: Theme): Promise<User> {
  return prisma.user.update({ where: { id: userId }, data: { theme } });
}
