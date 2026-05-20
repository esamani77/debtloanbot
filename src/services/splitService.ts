import crypto from 'crypto';
import { Currency, SplitStatus, SplitType, BillItem } from '@prisma/client';
import prisma from '../db/prisma';
import { computeNetBalances, simplifyDebts, Transfer } from '../utils/debtSimplification';

export interface BillInput {
  name: string;
  totalAmount: number;
  paidByIndex: number;
  splitType: SplitType;
  shares: number[];
}

export interface SessionCalculation {
  netBalances: number[];
  transfers: Transfer[];
  shareToken: string;
}

export async function createDraftSession(
  userId: string,
  name: string | undefined,
  currency: Currency,
  participants: string[],
): Promise<{ id: string }> {
  return prisma.splitSession.create({
    data: { createdById: userId, name: name ?? null, currency, participants },
    select: { id: true },
  });
}

export async function addBillToSession(sessionId: string, bill: BillInput): Promise<BillItem> {
  return prisma.billItem.create({
    data: {
      sessionId,
      name: bill.name,
      totalAmount: bill.totalAmount,
      paidByIndex: bill.paidByIndex,
      splitType: bill.splitType,
      shares: bill.shares,
    },
  });
}

export async function calculateSession(sessionId: string): Promise<SessionCalculation> {
  const session = await prisma.splitSession.findUnique({
    where: { id: sessionId },
    include: { bills: true },
  });
  if (!session) throw new Error('Session not found');

  const netBalances = computeNetBalances(session.participants, session.bills);
  const transfers = simplifyDebts(session.participants, netBalances, session.currency);
  const shareToken = crypto.randomBytes(8).toString('hex');
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  await prisma.splitSession.update({
    where: { id: sessionId },
    data: { status: SplitStatus.CALCULATED, shareToken, expiresAt },
  });

  return { netBalances, transfers, shareToken };
}

export async function markSessionShared(sessionId: string): Promise<void> {
  await prisma.splitSession.update({
    where: { id: sessionId },
    data: { status: SplitStatus.SHARED },
  });
}

export async function getSessionById(id: string) {
  return prisma.splitSession.findUnique({
    where: { id },
    include: { bills: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function getSessionByToken(token: string) {
  const session = await prisma.splitSession.findUnique({
    where: { shareToken: token },
    include: { bills: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) return null;
  if (session.expiresAt && session.expiresAt < new Date()) return 'expired' as const;
  return session;
}

export async function listUserSessions(userId: string, limit = 10) {
  return prisma.splitSession.findMany({
    where: { createdById: userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { bills: { select: { id: true } } },
  });
}

export async function getDraftSession(userId: string) {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  return prisma.splitSession.findFirst({
    where: {
      createdById: userId,
      status: SplitStatus.DRAFT,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    include: { bills: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function deleteSession(id: string): Promise<void> {
  await prisma.splitSession.delete({ where: { id } });
}

export async function getBankAccountsForParticipants(participants: string[]) {
  const users = await prisma.user.findMany({
    include: { bankAccounts: true },
  });

  const result: Record<string, Array<{ bankName: string; cardNumber: string; accountNumber: string; name: string }>> = {};

  for (const participant of participants) {
    const matched = users.find(
      (u) =>
        u.name.toLowerCase() === participant.toLowerCase() ||
        (u.nickname && u.nickname.toLowerCase() === participant.toLowerCase()),
    );
    if (matched && matched.bankAccounts.length > 0) {
      result[participant] = matched.bankAccounts.map((a) => ({
        bankName: a.bankName,
        cardNumber: a.cardNumber,
        accountNumber: a.accountNumber,
        name: a.name,
      }));
    }
  }

  return result;
}
