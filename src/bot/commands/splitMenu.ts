import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext, SplitDraft } from '../../models/types';
import { useT } from '../../i18n';
import { findUserByTelegramId } from '../../services/userService';
import {
  listUserSessions,
  getSessionById,
  resetSessionToDraft,
  calculateSession,
  markSessionShared,
  getBankAccountsForParticipants,
} from '../../services/splitService';
import { currencySymbol } from '../../utils/currency';
import { computeNetBalances, simplifyDebts } from '../../utils/debtSimplification';
import prisma from '../../db/prisma';

const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';
const STATUS_EMOJI: Record<string, string> = { DRAFT: '🟡', CALCULATED: '🟢', SHARED: '🔵' };

export async function splitMenuHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  const t = useT(ctx.session.userLanguage ?? Language.EN);
  const viewer = await findUserByTelegramId(String(ctx.from.id));
  if (!viewer) { await ctx.reply(t.errUserNotFound); return; }

  const sessions = await listUserSessions(viewer.id, 8);

  if (sessions.length === 0) {
    await ctx.reply(t.splitNoSessions, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(t.splitMenuNewSplit, 'split_menu_new')]]),
    });
    return;
  }

  const sessionButtons = sessions.map((s) => {
    const emoji = STATUS_EMOJI[s.status] ?? '⚪';
    const label = `${emoji} ${s.name ?? 'Unnamed'} (${s.bills.length} bills)`;
    return [Markup.button.callback(label, `split_open:${s.id}`)];
  });

  await ctx.reply(t.splitMenuTitle, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t.splitMenuNewSplit, 'split_menu_new')],
      ...sessionButtons,
    ]),
  });
}

export async function openSplitSession(ctx: BotContext, sessionId: string): Promise<void> {
  const t = useT(ctx.session.userLanguage ?? Language.EN);
  const session = await getSessionById(sessionId);
  if (!session) { await ctx.reply(t.splitSessionNotFound); return; }

  const sym = currencySymbol(session.currency, ctx.session.userLanguage);
  const detail = t.splitSessionDetail(
    session.name,
    session.currency,
    session.participants,
    session.bills.length,
    session.status,
    sym,
  );

  const buttons: ReturnType<typeof Markup.button.callback>[][] = [
    [Markup.button.callback(t.splitBtnAddBillToSession, `split_add_bill:${sessionId}`)],
  ];

  if (session.bills.length > 0) {
    buttons.push([Markup.button.callback(t.splitBtnRecalculate, `split_recalculate:${sessionId}`)]);
  }

  if (session.status === 'CALCULATED' || session.status === 'SHARED') {
    if (session.shareToken) {
      buttons.push([Markup.button.callback(t.splitBtnShareSession, `split_reshare:${sessionId}`)]);
    }
  }

  await ctx.editMessageText(detail, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
}

export async function addBillToExistingSession(ctx: BotContext, sessionId: string): Promise<void> {
  const t = useT(ctx.session.userLanguage ?? Language.EN);
  const session = await getSessionById(sessionId);
  if (!session) { await ctx.reply(t.splitSessionNotFound); return; }

  // Reset to DRAFT if already calculated/shared
  if (session.status !== 'DRAFT') {
    await resetSessionToDraft(sessionId);
  }

  // Prepare split draft with existing session data, but empty bills (new ones to be added)
  ctx.session.splitDraft = {
    sessionId,
    sessionName: session.name ?? undefined,
    currency: session.currency,
    participantCount: session.participants.length,
    participants: session.participants,
    participantTelegramIds: session.participantTelegramIds,
    collectingParticipantIndex: session.participants.length,
    bills: [],
    currentBill: {},
    currentShareIndex: 0,
  } satisfies SplitDraft;

  await ctx.reply(
    t.splitAddingBillToSession(session.name ?? null),
    { parse_mode: 'Markdown' },
  );
  await ctx.scene.enter('SPLIT');
}

export async function recalculateSession(ctx: BotContext, sessionId: string): Promise<void> {
  const t = useT(ctx.session.userLanguage ?? Language.EN);
  const session = await getSessionById(sessionId);
  if (!session) { await ctx.reply(t.splitSessionNotFound); return; }
  if (session.bills.length === 0) { await ctx.reply(t.splitZeroAmountError); return; }

  try {
    const { netBalances, transfers, shareToken } = await calculateSession(sessionId);
    const bankAccounts = await getBankAccountsForParticipants(session.participants, session.participantTelegramIds);
    const sym = currencySymbol(session.currency, ctx.session.userLanguage);

    const balanceSummary = t.splitBalanceSummary(session.participants, netBalances, sym);
    const plan = t.splitSettlementPlan(transfers, sym, bankAccounts);
    const link = `https://t.me/${BOT_USERNAME}?start=split_${shareToken}`;
    const shareMsg = t.splitShareLink(link, session.name ?? null);

    await ctx.editMessageText(
      `${balanceSummary}\n\n${plan}\n\n${shareMsg}`,
      { parse_mode: 'Markdown' },
    );
    await markSessionShared(sessionId);

    // Show per-participant invite links for unknown participants
    const invites = await prisma.splitParticipantInvite.findMany({ where: { splitSessionId: sessionId } });
    if (invites.length > 0) {
      const links = invites.map((inv) => ({
        name: session.participants[inv.participantIndex] ?? `Participant ${inv.participantIndex + 1}`,
        url: `https://t.me/${BOT_USERNAME}?start=splitjoin_${inv.token}`,
      }));
      await ctx.reply(t.splitUnknownParticipantLinks(links), { parse_mode: 'Markdown' });
    }
  } catch {
    await ctx.reply(t.errSomethingWrong);
  }
}

export async function reshareSession(ctx: BotContext, sessionId: string): Promise<void> {
  const t = useT(ctx.session.userLanguage ?? Language.EN);
  const session = await getSessionById(sessionId);
  if (!session || !session.shareToken) { await ctx.reply(t.splitSessionNotFound); return; }

  const netBalances = computeNetBalances(session.participants, session.bills);
  const transfers = simplifyDebts(session.participants, netBalances, session.currency);
  const bankAccounts = await getBankAccountsForParticipants(session.participants, session.participantTelegramIds);
  const sym = currencySymbol(session.currency, ctx.session.userLanguage);
  const link = `https://t.me/${BOT_USERNAME}?start=split_${session.shareToken}`;

  await ctx.editMessageText(
    `${t.splitBalanceSummary(session.participants, netBalances, sym)}\n\n${t.splitSettlementPlan(transfers, sym, bankAccounts)}\n\n${t.splitShareLink(link, session.name ?? null)}`,
    { parse_mode: 'Markdown' },
  );
}
