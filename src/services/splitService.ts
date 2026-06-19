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

export interface ParticipantInvite {
  index: number;
  name: string;
  token: string;
}

export interface SessionCalculation {
  netBalances: number[];
  transfers: Transfer[];
  shareToken: string;
  participantInvites: ParticipantInvite[];
}

export async function createDraftSession(
  userId: string,
  name: string | undefined,
  currency: Currency,
  participants: string[],
  participantTelegramIds?: string[],
  groupId?: string,
): Promise<{ id: string }> {
  const telegramIds = participantTelegramIds ?? participants.map(() => '');
  return prisma.splitSession.create({
    data: {
      createdById: userId,
      name: name ?? null,
      currency,
      participants,
      participantTelegramIds: telegramIds,
      ...(groupId ? { groupId } : {}),
    },
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

  // Regenerate per-unknown-participant invite tokens (delete old ones first for recalculation)
  await prisma.splitParticipantInvite.deleteMany({ where: { splitSessionId: sessionId } });

  const participantInvites: ParticipantInvite[] = [];
  for (let i = 0; i < session.participantTelegramIds.length; i++) {
    if (!session.participantTelegramIds[i]) {
      const inviteToken = crypto.randomBytes(8).toString('hex');
      await prisma.splitParticipantInvite.create({
        data: { token: inviteToken, splitSessionId: sessionId, participantIndex: i },
      });
      participantInvites.push({ index: i, name: session.participants[i], token: inviteToken });
    }
  }

  return { netBalances, transfers, shareToken, participantInvites };
}

export async function lockSession(id: string): Promise<void> {
  await prisma.splitSession.update({ where: { id }, data: { lockedAt: new Date() } });
}

export async function setSessionPublic(id: string, isPublic: boolean): Promise<void> {
  await prisma.splitSession.update({ where: { id }, data: { isPublic } });
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
    where: {
      OR: [
        { createdById: userId },
        { joinedUserIds: { has: userId } },
      ],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { bills: { select: { id: true } } },
  });
}

export async function joinSession(sessionId: string, userId: string): Promise<void> {
  await prisma.splitSession.update({
    where: { id: sessionId },
    data: { joinedUserIds: { push: userId } },
  });
}

export function isSessionMember(
  session: { createdById: string; joinedUserIds: string[] },
  userId: string,
): boolean {
  return session.createdById === userId || session.joinedUserIds.includes(userId);
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

export async function resetSessionToDraft(id: string): Promise<void> {
  await prisma.splitSession.update({
    where: { id },
    data: { status: SplitStatus.DRAFT, shareToken: null, expiresAt: null },
  });
}

export async function updateSessionMeta(
  id: string,
  data: { name?: string | null; currency?: Currency },
): Promise<void> {
  await prisma.splitSession.update({ where: { id }, data });
}

export async function updateBillInSession(sessionId: string, billId: string, data: BillInput): Promise<BillItem> {
  const bill = await prisma.billItem.findUnique({ where: { id: billId } });
  if (!bill || bill.sessionId !== sessionId) throw new Error('Bill not found');

  const updated = await prisma.billItem.update({
    where: { id: billId },
    data: {
      name: data.name,
      totalAmount: data.totalAmount,
      paidByIndex: data.paidByIndex,
      splitType: data.splitType,
      shares: data.shares,
    },
  });

  const session = await prisma.splitSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (session && session.status !== SplitStatus.DRAFT) {
    await resetSessionToDraft(sessionId);
  }

  return updated;
}

export async function deleteBillFromSession(sessionId: string, billId: string): Promise<void> {
  const bill = await prisma.billItem.findUnique({ where: { id: billId } });
  if (!bill || bill.sessionId !== sessionId) throw new Error('Bill not found');

  await prisma.billItem.delete({ where: { id: billId } });

  const session = await prisma.splitSession.findUnique({ where: { id: sessionId }, select: { status: true } });
  if (session && session.status !== SplitStatus.DRAFT) {
    await resetSessionToDraft(sessionId);
  }
}

export async function replaceAllBills(sessionId: string, bills: BillInput[]): Promise<void> {
  await prisma.$transaction([
    prisma.billItem.deleteMany({ where: { sessionId } }),
    ...bills.map((bill) =>
      prisma.billItem.create({
        data: {
          sessionId,
          name: bill.name,
          totalAmount: bill.totalAmount,
          paidByIndex: bill.paidByIndex,
          splitType: bill.splitType,
          shares: bill.shares,
        },
      }),
    ),
  ]);
}

export async function getBankAccountsForParticipants(
  participants: string[],
  participantTelegramIds?: string[],
) {
  const users = await prisma.user.findMany({
    include: { bankAccounts: true },
  });

  const result: Record<string, Array<{ bankName: string; cardNumber: string; accountNumber: string; name: string }>> = {};

  for (let i = 0; i < participants.length; i++) {
    const participant = participants[i];
    const telegramId = participantTelegramIds?.[i];

    const matched = telegramId
      ? telegramId.startsWith('@')
        ? users.find((u) => u.username === telegramId.slice(1).toLowerCase())
        : users.find((u) => u.telegramId === telegramId)
      : users.find(
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
