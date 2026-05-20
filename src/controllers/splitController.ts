import { Request, Response } from 'express';
import { Currency, SplitType } from '@prisma/client';
import { findOrCreateUser } from '../services/userService';
import {
  createDraftSession,
  addBillToSession,
  calculateSession,
  markSessionShared,
  getSessionById,
  getSessionByToken,
  listUserSessions,
  deleteSession,
  getBankAccountsForParticipants,
} from '../services/splitService';
import { computeNetBalances, simplifyDebts } from '../utils/debtSimplification';
import { currencySymbol } from '../utils/currency';

const ALL_CURRENCIES: string[] = ['USD', 'EUR', 'GBP', 'IRR', 'TRY'];
const SPLIT_TYPES: string[] = ['EQUAL', 'PERCENTAGE', 'CUSTOM'];
const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';

// GET /api/splits
export async function listSessions(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const sessions = await listUserSessions(viewer.id, 20);

    res.json(
      sessions.map((s) => ({
        id: s.id,
        name: s.name,
        currency: s.currency,
        status: s.status,
        participants: s.participants,
        billCount: s.bills.length,
        shareToken: s.shareToken,
        createdAt: s.createdAt,
      })),
    );
  } catch {
    res.status(500).json({ error: 'Failed to list sessions.' });
  }
}

// POST /api/splits
export async function createSession(req: Request, res: Response): Promise<void> {
  const { name, currency, participants } = req.body as {
    name?: string;
    currency?: string;
    participants?: unknown;
  };

  if (!currency || !ALL_CURRENCIES.includes(currency)) {
    res.status(400).json({ error: `currency must be one of: ${ALL_CURRENCIES.join(', ')}.` });
    return;
  }
  if (!Array.isArray(participants) || participants.length < 2 || participants.length > 20) {
    res.status(400).json({ error: 'participants must be an array of 2–20 names.' });
    return;
  }
  if (participants.some((p) => typeof p !== 'string' || !p.trim())) {
    res.status(400).json({ error: 'All participant names must be non-empty strings.' });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const session = await createDraftSession(
      viewer.id,
      name || undefined,
      currency as Currency,
      participants as string[],
    );
    res.status(201).json({ id: session.id });
  } catch {
    res.status(500).json({ error: 'Failed to create session.' });
  }
}

// GET /api/splits/:id
export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const session = await getSessionById(String(req.params.id));
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (session.createdById !== viewer.id) { res.status(403).json({ error: 'Access denied.' }); return; }

    let netBalances: number[] | null = null;
    let transfers: Array<{ from: string; to: string; amount: number }> | null = null;
    if (session.status !== 'DRAFT') {
      netBalances = computeNetBalances(session.participants, session.bills);
      transfers = simplifyDebts(session.participants, netBalances, session.currency);
    }

    res.json({
      id: session.id,
      name: session.name,
      currency: session.currency,
      status: session.status,
      participants: session.participants,
      bills: session.bills.map((b) => ({
        id: b.id,
        name: b.name,
        totalAmount: b.totalAmount,
        paidByIndex: b.paidByIndex,
        paidBy: session.participants[b.paidByIndex],
        splitType: b.splitType,
        shares: b.shares,
      })),
      netBalances,
      transfers,
      shareToken: session.shareToken,
      shareLink: session.shareToken ? `https://t.me/${BOT_USERNAME}?start=split_${session.shareToken}` : null,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to get session.' });
  }
}

// POST /api/splits/:id/bills
export async function addBill(req: Request, res: Response): Promise<void> {
  const { name, totalAmount, paidByIndex, splitType, shares } = req.body as {
    name?: string;
    totalAmount?: number;
    paidByIndex?: number;
    splitType?: string;
    shares?: unknown;
  };

  if (!name || typeof name !== 'string' || !name.trim()) {
    res.status(400).json({ error: 'name is required.' });
    return;
  }
  if (typeof totalAmount !== 'number' || totalAmount <= 0) {
    res.status(400).json({ error: 'totalAmount must be a positive number.' });
    return;
  }
  if (typeof paidByIndex !== 'number' || paidByIndex < 0) {
    res.status(400).json({ error: 'paidByIndex must be a non-negative integer.' });
    return;
  }
  if (!splitType || !SPLIT_TYPES.includes(splitType)) {
    res.status(400).json({ error: `splitType must be one of: ${SPLIT_TYPES.join(', ')}.` });
    return;
  }
  if (!Array.isArray(shares) || shares.some((s) => typeof s !== 'number')) {
    res.status(400).json({ error: 'shares must be an array of numbers.' });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const session = await getSessionById(String(req.params.id));
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (session.createdById !== viewer.id) { res.status(403).json({ error: 'Access denied.' }); return; }
    if (session.status !== 'DRAFT') { res.status(409).json({ error: 'Session is already calculated. Cannot add bills.' }); return; }
    if (paidByIndex >= session.participants.length) {
      res.status(400).json({ error: 'paidByIndex out of range.' });
      return;
    }
    if ((shares as number[]).length !== session.participants.length) {
      res.status(400).json({ error: `shares must have exactly ${session.participants.length} entries.` });
      return;
    }

    const bill = await addBillToSession(String(req.params.id), {
      name: name.trim(),
      totalAmount,
      paidByIndex,
      splitType: splitType as SplitType,
      shares: shares as number[],
    });

    res.status(201).json({
      id: bill.id,
      name: bill.name,
      totalAmount: bill.totalAmount,
      paidByIndex: bill.paidByIndex,
      paidBy: session.participants[bill.paidByIndex],
      splitType: bill.splitType,
      shares: bill.shares,
    });
  } catch {
    res.status(500).json({ error: 'Failed to add bill.' });
  }
}

// POST /api/splits/:id/calculate
export async function calculate(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const session = await getSessionById(String(req.params.id));
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (session.createdById !== viewer.id) { res.status(403).json({ error: 'Access denied.' }); return; }
    if (session.bills.length === 0) { res.status(400).json({ error: 'Session has no bills.' }); return; }

    const { netBalances, transfers, shareToken } = await calculateSession(String(req.params.id));
    await markSessionShared(String(req.params.id));
    const bankAccounts = await getBankAccountsForParticipants(session.participants);
    const sym = currencySymbol(session.currency);

    res.json({
      netBalances: session.participants.map((name, i) => ({
        participant: name,
        balance: netBalances[i],
      })),
      transfers: transfers.map((t) => ({
        from: t.from,
        to: t.to,
        amount: t.amount,
        symbol: sym,
        bankAccounts: bankAccounts[t.to] ?? [],
      })),
      shareToken,
      shareLink: `https://t.me/${BOT_USERNAME}?start=split_${shareToken}`,
    });
  } catch {
    res.status(500).json({ error: 'Failed to calculate session.' });
  }
}

// GET /api/splits/share/:token  (public — no auth)
export async function getSharedSession(req: Request, res: Response): Promise<void> {
  try {
    const result = await getSessionByToken(String(req.params.token));
    if (!result) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (result === 'expired') { res.status(410).json({ error: 'Session expired.' }); return; }

    const netBalances = computeNetBalances(result.participants, result.bills);
    const transfers = simplifyDebts(result.participants, netBalances, result.currency);
    const bankAccounts = await getBankAccountsForParticipants(result.participants);
    const sym = currencySymbol(result.currency);

    res.json({
      id: result.id,
      name: result.name,
      currency: result.currency,
      symbol: sym,
      participants: result.participants,
      bills: result.bills.map((b) => ({
        id: b.id,
        name: b.name,
        totalAmount: b.totalAmount,
        paidBy: result.participants[b.paidByIndex],
        splitType: b.splitType,
        shares: b.shares.map((s, i) => ({ participant: result.participants[i], amount: s })),
      })),
      netBalances: result.participants.map((name, i) => ({
        participant: name,
        balance: netBalances[i],
      })),
      transfers: transfers.map((t) => ({
        from: t.from,
        to: t.to,
        amount: t.amount,
        bankAccounts: bankAccounts[t.to] ?? [],
      })),
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
    });
  } catch {
    res.status(500).json({ error: 'Failed to load session.' });
  }
}

// DELETE /api/splits/:id
export async function removeSplitSession(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const session = await getSessionById(String(req.params.id));
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (session.createdById !== viewer.id) { res.status(403).json({ error: 'Access denied.' }); return; }
    await deleteSession(String(req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete session.' });
  }
}
