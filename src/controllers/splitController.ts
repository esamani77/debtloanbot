import { Request, Response } from "express";
import { Currency, SplitType } from "@prisma/client";
import { findUserById, getDisplayName } from "../services/userService";
import prisma from "../db/prisma";
import { bot } from "../bot/index";
import { notifySplitParticipants } from "../utils/splitNotifications";
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
  updateSessionMeta,
  resetSessionToDraft,
  replaceAllBills,
  joinSession,
  isSessionMember,
  setSessionPublic,
  lockSession,
} from "../services/splitService";
import { computeNetBalances, simplifyDebts } from "../utils/debtSimplification";
import { currencySymbol } from "../utils/currency";

const ALL_CURRENCIES: string[] = ["USD", "EUR", "GBP", "IRT", "TRY"];
const SPLIT_TYPES: string[] = ["EQUAL", "PERCENTAGE", "CUSTOM"];
const BOT_USERNAME = process.env.BOT_USERNAME ?? "debt_mate_bot";

export async function listSessions(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
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
        isPublic: s.isPublic,
        lockedAt: s.lockedAt,
        createdAt: s.createdAt,
        groupId: s.groupId ?? null,
      })),
    );
  } catch {
    res.status(500).json({ error: "Failed to list sessions." });
  }
}

export async function createSession(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, currency, participants, participantTelegramIds, groupId } = req.body as {
    name?: string;
    currency?: string;
    participants?: unknown;
    participantTelegramIds?: unknown;
    groupId?: string;
  };

  if (!currency || !ALL_CURRENCIES.includes(currency)) {
    res
      .status(400)
      .json({
        error: `currency must be one of: ${ALL_CURRENCIES.join(", ")}.`,
      });
    return;
  }
  if (
    !Array.isArray(participants) ||
    participants.length < 2 ||
    participants.length > 20
  ) {
    res
      .status(400)
      .json({ error: "participants must be an array of 2–20 names." });
    return;
  }
  if (participants.some((p) => typeof p !== "string" || !p.trim())) {
    res
      .status(400)
      .json({ error: "All participant names must be non-empty strings." });
    return;
  }
  if (participantTelegramIds !== undefined) {
    if (
      !Array.isArray(participantTelegramIds) ||
      participantTelegramIds.length !== participants.length
    ) {
      res
        .status(400)
        .json({
          error:
            "participantTelegramIds must be an array with the same length as participants.",
        });
      return;
    }
    if (
      (participantTelegramIds as unknown[]).some((id) => typeof id !== "string")
    ) {
      res
        .status(400)
        .json({ error: "All participantTelegramIds must be strings." });
      return;
    }
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }

    // Validate group membership if groupId provided
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: { select: { userId: true } } },
      });
      if (!group) {
        res.status(404).json({ error: "Group not found." });
        return;
      }
      const isMember =
        group.createdById === viewer.id ||
        group.members.some((m) => m.userId === viewer.id);
      if (!isMember) {
        res.status(403).json({ error: "Not a member of this group." });
        return;
      }
    }

    const session = await createDraftSession(
      viewer.id,
      name || undefined,
      currency as Currency,
      participants as string[],
      participantTelegramIds as string[] | undefined,
      groupId,
    );
    res.status(201).json({ id: session.id });
  } catch {
    res.status(500).json({ error: "Failed to create session." });
  }
}

export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (!isSessionMember(session, viewer.id)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    let netBalances: number[] | null = null;
    let transfers: Array<{ from: string; to: string; amount: number }> | null =
      null;
    if (session.status !== "DRAFT") {
      netBalances = computeNetBalances(session.participants, session.bills);
      transfers = simplifyDebts(
        session.participants,
        netBalances,
        session.currency,
      );
    }

    res.json({
      id: session.id,
      name: session.name,
      currency: session.currency,
      status: session.status,
      participants: session.participants,
      participantTelegramIds: session.participantTelegramIds,
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
      isPublic: session.isPublic,
      shareLink: session.shareToken
        ? `https://t.me/${BOT_USERNAME}?start=split_${session.shareToken}`
        : null,
      expiresAt: session.expiresAt,
      lockedAt: session.lockedAt,
      createdAt: session.createdAt,
      groupId: session.groupId ?? null,
    });
  } catch {
    res.status(500).json({ error: "Failed to get session." });
  }
}

export async function addBill(req: Request, res: Response): Promise<void> {
  const { name, totalAmount, paidByIndex, splitType, shares } = req.body as {
    name?: string;
    totalAmount?: number;
    paidByIndex?: number;
    splitType?: string;
    shares?: unknown;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name is required." });
    return;
  }
  if (typeof totalAmount !== "number" || totalAmount <= 0) {
    res.status(400).json({ error: "totalAmount must be a positive number." });
    return;
  }
  if (typeof paidByIndex !== "number" || paidByIndex < 0) {
    res
      .status(400)
      .json({ error: "paidByIndex must be a non-negative integer." });
    return;
  }
  if (!splitType || !SPLIT_TYPES.includes(splitType)) {
    res
      .status(400)
      .json({ error: `splitType must be one of: ${SPLIT_TYPES.join(", ")}.` });
    return;
  }
  if (!Array.isArray(shares) || shares.some((s) => typeof s !== "number")) {
    res.status(400).json({ error: "shares must be an array of numbers." });
    return;
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (!isSessionMember(session, viewer.id)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (session.lockedAt) {
      res.status(423).json({ error: "Session is locked and cannot be modified." });
      return;
    }
    if (paidByIndex >= session.participants.length) {
      res.status(400).json({ error: "paidByIndex out of range." });
      return;
    }
    if ((shares as number[]).length !== session.participants.length) {
      res
        .status(400)
        .json({
          error: `shares must have exactly ${session.participants.length} entries.`,
        });
      return;
    }

    const wasCalculated = session.status !== "DRAFT";
    const bill = await addBillToSession(String(req.params.id), {
      name: name.trim(),
      totalAmount,
      paidByIndex,
      splitType: splitType as SplitType,
      shares: shares as number[],
    });

    if (wasCalculated) {
      await resetSessionToDraft(String(req.params.id));
    }

    res.status(201).json({
      id: bill.id,
      name: bill.name,
      totalAmount: bill.totalAmount,
      paidByIndex: bill.paidByIndex,
      paidBy: session.participants[bill.paidByIndex],
      splitType: bill.splitType,
      shares: bill.shares,
      resetToDraft: wasCalculated,
    });
  } catch {
    res.status(500).json({ error: "Failed to add bill." });
  }
}

export async function calculate(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (!isSessionMember(session, viewer.id)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (session.bills.length === 0) {
      res.status(400).json({ error: "Session has no bills." });
      return;
    }

    const { netBalances, transfers, shareToken } = await calculateSession(
      String(req.params.id),
    );
    await markSessionShared(String(req.params.id));

    notifySplitParticipants({
      telegram: bot.telegram,
      sessionName: session.name,
      currency: session.currency,
      participants: session.participants,
      participantTelegramIds: session.participantTelegramIds,
      netBalances,
      transfers,
      shareToken,
      creatorName: getDisplayName(viewer),
      creatorTelegramId: viewer.telegramId ?? undefined,
    }).catch(() => {});

    const bankAccounts = await getBankAccountsForParticipants(
      session.participants,
      session.participantTelegramIds,
    );
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
    res.status(500).json({ error: "Failed to calculate session." });
  }
}

export async function getSharedSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const result = await getSessionByToken(String(req.params.token));
    if (!result) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (result === "expired") {
      res.status(410).json({ error: "Session expired." });
      return;
    }
    if (!result.isPublic) {
      res.status(403).json({ error: "This split is not public." });
      return;
    }

    const netBalances = computeNetBalances(result.participants, result.bills);
    const transfers = simplifyDebts(
      result.participants,
      netBalances,
      result.currency,
    );
    const bankAccounts = await getBankAccountsForParticipants(
      result.participants,
      result.participantTelegramIds,
    );
    const sym = currencySymbol(result.currency);

    res.json({
      id: result.id,
      name: result.name,
      currency: result.currency,
      symbol: sym,
      participants: result.participants,
      participantTelegramIds: result.participantTelegramIds,
      bills: result.bills.map((b) => ({
        id: b.id,
        name: b.name,
        totalAmount: b.totalAmount,
        paidBy: result.participants[b.paidByIndex],
        splitType: b.splitType,
        shares: b.shares.map((s, i) => ({
          participant: result.participants[i],
          amount: s,
        })),
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
      isPublic: result.isPublic,
      createdAt: result.createdAt,
      expiresAt: result.expiresAt,
    });
  } catch {
    res.status(500).json({ error: "Failed to load session." });
  }
}

export async function togglePublic(req: Request, res: Response): Promise<void> {
  const { isPublic } = req.body as { isPublic?: unknown };
  if (typeof isPublic !== "boolean") {
    res.status(400).json({ error: "isPublic must be a boolean." });
    return;
  }
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (session.createdById !== viewer.id) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (session.status === "DRAFT") {
      res.status(400).json({ error: "Calculate the split before making it public." });
      return;
    }
    await setSessionPublic(session.id, isPublic);
    res.json({ isPublic });
  } catch {
    res.status(500).json({ error: "Failed to update visibility." });
  }
}

export async function updateSession(
  req: Request,
  res: Response,
): Promise<void> {
  const { name, currency } = req.body as {
    name?: string | null;
    currency?: string;
  };

  if (currency !== undefined && !ALL_CURRENCIES.includes(currency)) {
    res
      .status(400)
      .json({
        error: `currency must be one of: ${ALL_CURRENCIES.join(", ")}.`,
      });
    return;
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (!isSessionMember(session, viewer.id)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    await updateSessionMeta(String(req.params.id), {
      name: name !== undefined ? name || null : undefined,
      currency: currency ? (currency as Currency) : undefined,
    });

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to update session." });
  }
}

export async function joinSplitSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const result = await getSessionByToken(String(req.params.token));
    if (!result) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (result === "expired") {
      res.status(410).json({ error: "Session expired." });
      return;
    }
    if (isSessionMember(result, viewer.id)) {
      res.status(200).json({ id: result.id, alreadyMember: true });
      return;
    }
    await joinSession(result.id, viewer.id);
    res.status(200).json({ id: result.id, alreadyMember: false });
  } catch {
    res.status(500).json({ error: "Failed to join session." });
  }
}

export async function replaceSessionBills(
  req: Request,
  res: Response,
): Promise<void> {
  const { bills } = req.body as { bills?: unknown[] };

  if (!Array.isArray(bills) || bills.length === 0) {
    res.status(400).json({ error: "bills must be a non-empty array." });
    return;
  }

  for (const b of bills as Record<string, unknown>[]) {
    if (!b.name || typeof b.name !== "string") {
      res.status(400).json({ error: "Each bill must have a name." });
      return;
    }
    if (typeof b.totalAmount !== "number" || (b.totalAmount as number) <= 0) {
      res
        .status(400)
        .json({ error: "Each bill must have a positive totalAmount." });
      return;
    }
    if (typeof b.paidByIndex !== "number") {
      res.status(400).json({ error: "Each bill must have a paidByIndex." });
      return;
    }
    if (!b.splitType || !SPLIT_TYPES.includes(b.splitType as string)) {
      res
        .status(400)
        .json({
          error: `splitType must be one of: ${SPLIT_TYPES.join(", ")}.`,
        });
      return;
    }
    if (
      !Array.isArray(b.shares) ||
      (b.shares as unknown[]).some((s) => typeof s !== "number")
    ) {
      res
        .status(400)
        .json({ error: "Each bill must have shares as number[]." });
      return;
    }
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (!isSessionMember(session, viewer.id)) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (session.lockedAt) {
      res.status(423).json({ error: "Session is locked and cannot be modified." });
      return;
    }

    await resetSessionToDraft(String(req.params.id));

    const typedBills = (bills as Record<string, unknown>[]).map((b) => ({
      name: b.name as string,
      totalAmount: b.totalAmount as number,
      paidByIndex: b.paidByIndex as number,
      splitType: b.splitType as import("@prisma/client").SplitType,
      shares: b.shares as number[],
    }));

    await replaceAllBills(String(req.params.id), typedBills);
    res.json({ ok: true, billCount: typedBills.length });
  } catch {
    res.status(500).json({ error: "Failed to replace bills." });
  }
}

export async function lockSplit(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (session.createdById !== viewer.id) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (session.lockedAt) {
      res.status(200).json({ lockedAt: session.lockedAt });
      return;
    }
    await lockSession(String(req.params.id));
    res.json({ lockedAt: new Date() });
  } catch {
    res.status(500).json({ error: "Failed to lock session." });
  }
}

export async function removeSplitSession(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    const session = await getSessionById(String(req.params.id));
    if (!session) {
      res.status(404).json({ error: "Session not found." });
      return;
    }
    if (session.createdById !== viewer.id) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    await deleteSession(String(req.params.id));
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Failed to delete session." });
  }
}
