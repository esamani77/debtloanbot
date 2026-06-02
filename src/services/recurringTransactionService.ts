import { RecurringInterval, TransactionType } from '@prisma/client';
import prisma from '../db/prisma';
import { addTransaction } from './transactionService';

interface CreateRecurringParams {
  relationshipId: string;
  createdById: string;
  amount: number;
  type: TransactionType;
  note?: string;
  interval: RecurringInterval;
}

export function computeNextDueAt(from: Date, interval: RecurringInterval): Date {
  const d = new Date(from);
  switch (interval) {
    case RecurringInterval.WEEKLY:
      d.setDate(d.getDate() + 7);
      break;
    case RecurringInterval.BIWEEKLY:
      d.setDate(d.getDate() + 14);
      break;
    case RecurringInterval.MONTHLY:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

export async function createRecurringTransaction(params: CreateRecurringParams) {
  const { relationshipId, createdById, amount, type, note, interval } = params;

  const nextDueAt = computeNextDueAt(new Date(), interval);

  const firstTransaction = await addTransaction({ relationshipId, createdById, amount, type, note });

  const recurring = await prisma.recurringTransaction.create({
    data: {
      relationshipId,
      createdById,
      amount,
      type,
      note: note ?? null,
      interval,
      nextDueAt,
      isActive: true,
      transactions: { connect: { id: firstTransaction.id } },
    },
  });

  return { recurring, firstTransaction };
}

export async function getActiveRecurringForUser(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      relationship: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
    },
    include: {
      relationship: { include: { userA: true, userB: true } },
    },
    orderBy: { nextDueAt: 'asc' },
  });
}

export async function cancelRecurringTransaction(recurringId: string, userId: string) {
  const recurring = await prisma.recurringTransaction.findUnique({
    where: { id: recurringId },
    include: { relationship: true },
  });

  if (!recurring) throw new Error('Recurring transaction not found.');
  const rel = recurring.relationship;
  if (rel.userAId !== userId && rel.userBId !== userId) throw new Error('Not authorized.');

  return prisma.recurringTransaction.update({
    where: { id: recurringId },
    data: { isActive: false },
  });
}

export async function getDueRecurringTransactions() {
  return prisma.recurringTransaction.findMany({
    where: {
      isActive: true,
      nextDueAt: { lte: new Date() },
    },
    include: {
      relationship: { include: { userA: true, userB: true } },
    },
  });
}

export async function materializeRecurring(recurring: {
  id: string;
  relationshipId: string;
  createdById: string;
  amount: number;
  type: TransactionType;
  note: string | null;
  interval: RecurringInterval;
}) {
  const transaction = await prisma.transaction.create({
    data: {
      relationshipId: recurring.relationshipId,
      createdById: recurring.createdById,
      amount: recurring.amount,
      type: recurring.type,
      note: recurring.note,
      recurringTransactionId: recurring.id,
    },
  });

  const nextDueAt = computeNextDueAt(new Date(), recurring.interval);
  await prisma.recurringTransaction.update({
    where: { id: recurring.id },
    data: { nextDueAt },
  });

  return transaction;
}

export async function getRecurringTransactionById(id: string) {
  return prisma.recurringTransaction.findUnique({
    where: { id },
    include: { relationship: { include: { userA: true, userB: true } } },
  });
}
