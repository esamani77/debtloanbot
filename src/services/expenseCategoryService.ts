import prisma from '../db/prisma';

export const SYSTEM_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍕', color: '#FF6B6B' },
  { name: 'Transportation', icon: '🚗', color: '#4ECDC4' },
  { name: 'Housing', icon: '🏠', color: '#45B7D1' },
  { name: 'Shopping', icon: '🛒', color: '#96CEB4' },
  { name: 'Entertainment', icon: '🎬', color: '#FFEAA7' },
  { name: 'Health', icon: '💊', color: '#DDA0DD' },
  { name: 'Education', icon: '📚', color: '#98D8C8' },
  { name: 'Travel', icon: '✈️', color: '#F7DC6F' },
  { name: 'Work', icon: '💼', color: '#85C1E9' },
  { name: 'Gifts', icon: '🎁', color: '#F1948A' },
  { name: 'Finance', icon: '💰', color: '#82E0AA' },
  { name: 'Other', icon: '📦', color: '#AEB6BF' },
];

export async function ensureSystemCategories() {
  const existing = await prisma.expenseCategory.count({ where: { isSystem: true } });
  if (existing >= SYSTEM_CATEGORIES.length) return;

  for (const cat of SYSTEM_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: {
        // use a deterministic check by name+isSystem
        id: `sys_${cat.name.toLowerCase().replace(/[^a-z]/g, '_')}`,
      },
      update: {},
      create: {
        id: `sys_${cat.name.toLowerCase().replace(/[^a-z]/g, '_')}`,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
        userId: null,
      },
    });
  }
}

export async function getUserCategories(userId: string) {
  return prisma.expenseCategory.findMany({
    where: { OR: [{ isSystem: true }, { userId }] },
    orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
  });
}

export async function createCategory(userId: string, data: { name: string; icon: string; color: string }) {
  return prisma.expenseCategory.create({
    data: { ...data, userId, isSystem: false },
  });
}

export async function updateCategory(id: string, userId: string, data: { name?: string; icon?: string; color?: string }) {
  const cat = await prisma.expenseCategory.findFirst({ where: { id, userId, isSystem: false } });
  if (!cat) return null;
  return prisma.expenseCategory.update({ where: { id }, data });
}

export async function deleteCategory(id: string, userId: string): Promise<'not_found' | 'in_use' | 'ok'> {
  const cat = await prisma.expenseCategory.findFirst({ where: { id, userId, isSystem: false } });
  if (!cat) return 'not_found';
  const inUse = await prisma.expense.count({ where: { categoryId: id } });
  if (inUse > 0) return 'in_use';
  await prisma.expenseCategory.delete({ where: { id } });
  return 'ok';
}
