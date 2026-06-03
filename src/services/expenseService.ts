import prisma from '../db/prisma';
import { Currency } from '@prisma/client';

export interface CreateExpenseInput {
  title: string;
  amount: number;
  currency: Currency;
  categoryId: string;
  note?: string;
  date?: Date;
  transactionId?: string;
}

export interface ExpenseFilters {
  month?: number;
  year?: number;
  categoryId?: string;
}

const expenseInclude = {
  category: true,
  transaction: {
    include: {
      relationship: true,
    },
  },
} as const;

export async function createExpense(userId: string, input: CreateExpenseInput) {
  if (input.amount <= 0) throw new Error('Amount must be positive');

  if (input.transactionId) {
    const tx = await prisma.transaction.findFirst({
      where: { id: input.transactionId, createdById: userId },
    });
    if (!tx) throw new Error('Transaction not found or not owned by user');
    const already = await prisma.expense.findUnique({ where: { transactionId: input.transactionId } });
    if (already) throw new Error('Transaction already linked to an expense');
  }

  return prisma.expense.create({
    data: {
      userId,
      title: input.title,
      amount: input.amount,
      currency: input.currency,
      categoryId: input.categoryId,
      note: input.note,
      date: input.date ?? new Date(),
      transactionId: input.transactionId,
    },
    include: expenseInclude,
  });
}

export async function getExpenses(userId: string, filters: ExpenseFilters = {}) {
  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (filters.month !== undefined && filters.year !== undefined) {
    dateFilter = {
      gte: new Date(filters.year, filters.month - 1, 1),
      lt: new Date(filters.year, filters.month, 1),
    };
  }

  const where = {
    userId,
    ...(dateFilter ? { date: dateFilter } : {}),
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
  };

  return prisma.expense.findMany({
    where,
    include: expenseInclude,
    orderBy: { date: 'desc' },
  });
}

export async function getExpenseById(id: string, userId: string) {
  return prisma.expense.findFirst({ where: { id, userId }, include: expenseInclude });
}

export async function updateExpense(
  id: string,
  userId: string,
  data: Partial<Pick<CreateExpenseInput, 'title' | 'amount' | 'currency' | 'categoryId' | 'note' | 'date'>>,
) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) return null;
  if (data.amount !== undefined && data.amount <= 0) throw new Error('Amount must be positive');
  return prisma.expense.update({ where: { id }, data, include: expenseInclude });
}

export async function deleteExpense(id: string, userId: string) {
  const expense = await prisma.expense.findFirst({ where: { id, userId } });
  if (!expense) return false;
  await prisma.expense.delete({ where: { id } });
  return true;
}

export async function linkExpenseToTransaction(expenseId: string, transactionId: string, userId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw new Error('Expense not found');

  const tx = await prisma.transaction.findFirst({ where: { id: transactionId, createdById: userId } });
  if (!tx) throw new Error('Transaction not found or not owned by user');

  const already = await prisma.expense.findUnique({ where: { transactionId } });
  if (already && already.id !== expenseId) throw new Error('Transaction already linked to another expense');

  return prisma.expense.update({
    where: { id: expenseId },
    data: { transactionId },
    include: expenseInclude,
  });
}

export async function unlinkExpenseFromTransaction(expenseId: string, userId: string) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw new Error('Expense not found');
  return prisma.expense.update({
    where: { id: expenseId },
    data: { transactionId: null },
    include: expenseInclude,
  });
}

export async function getExpenseStats(userId: string, month: number, year: number) {
  // Category breakdown for the given month
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { category: true },
  });

  const byCategory = new Map<string, { category: { id: string; name: string; icon: string; color: string }; amount: number }>();
  for (const e of expenses) {
    const key = e.categoryId;
    if (!byCategory.has(key)) {
      byCategory.set(key, { category: e.category, amount: 0 });
    }
    byCategory.get(key)!.amount += e.amount;
  }

  // Monthly totals for last 6 months
  const sixMonthsAgo = new Date(year, month - 7, 1);
  const allRecent = await prisma.expense.findMany({
    where: { userId, date: { gte: sixMonthsAgo, lt: end } },
    select: { amount: true, date: true },
  });

  const monthlyMap = new Map<string, number>();
  for (const e of allRecent) {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + e.amount);
  }

  const monthlyTotals = Array.from(monthlyMap.entries())
    .map(([key, total]) => {
      const [y, m] = key.split('-').map(Number);
      return { year: y, month: m, total };
    })
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  return {
    totalByCategory: Array.from(byCategory.values()),
    monthlyTotals,
    grandTotal: (expenses as Array<{ amount: number }>).reduce((sum, e) => sum + e.amount, 0),
  };
}
