import { Scenes, Markup } from 'telegraf';
import { Currency, Language } from '@prisma/client';
import { BotContext, SplitDraft, BillDraft } from '../../models/types';
import { useT } from '../../i18n';
import { currencySymbol, currencyLabel, ALL_CURRENCIES } from '../../utils/currency';
import { computeEqualShares, computeNetBalances, simplifyDebts } from '../../utils/debtSimplification';
import {
  createDraftSession,
  addBillToSession,
  calculateSession,
  markSessionShared,
  getBankAccountsForParticipants,
  getDraftSession,
  deleteSession,
  getSessionById,
} from '../../services/splitService';
import prisma from '../../db/prisma';
import { findUserByTelegramId, getDisplayName, findOrCreateUser } from '../../services/userService';
import { notifySplitParticipants } from '../../utils/splitNotifications';
import { getUserRelationships } from '../../services/relationshipService';
import { generateInviteLink } from '../../utils/inviteLink';

const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';

function draft(ctx: BotContext): SplitDraft {
  if (!ctx.session.splitDraft) {
    ctx.session.splitDraft = {
      participants: [],
      participantTelegramIds: [],
      collectingParticipantIndex: 0,
      bills: [],
      currentBill: {},
      currentShareIndex: 0,
    };
  }
  return ctx.session.splitDraft;
}

function T(ctx: BotContext) {
  return useT(ctx.session.userLanguage ?? Language.EN);
}

function currencyKeyboard() {
  return Markup.inlineKeyboard(
    ALL_CURRENCIES.map((c) => Markup.button.callback(currencyLabel(c), `split_currency:${c}`)),
    { columns: 1 },
  );
}

function payerKeyboard(participants: string[]) {
  return Markup.inlineKeyboard(
    participants.map((p, i) => Markup.button.callback(p, `split_payer:${i}`)),
    { columns: 2 },
  );
}

function splitTypeKeyboard(t: ReturnType<typeof useT>) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t.splitBtnEqual, 'split_type:EQUAL')],
    [Markup.button.callback(t.splitBtnByPercentage, 'split_type:PERCENTAGE')],
    [Markup.button.callback(t.splitBtnCustomAmount, 'split_type:CUSTOM')],
    [Markup.button.callback(t.splitBtnCancel, 'split_cancel')],
  ]);
}

function participantModeKeyboard(t: ReturnType<typeof useT>, includeSelf: boolean) {
  const rows = [
    [
      Markup.button.callback(t.splitBtnFromContacts, 'split_mode:contact'),
      Markup.button.callback(t.splitBtnByTelegramId, 'split_mode:telegram'),
    ],
    [Markup.button.callback(t.splitBtnByName, 'split_mode:name')],
  ];
  if (includeSelf) {
    rows.splice(1, 0, [Markup.button.callback(t.splitBtnMyself, 'split_mode:myself')]);
  }
  rows.push([Markup.button.callback(t.splitBtnCancel, 'split_cancel')]);
  return Markup.inlineKeyboard(rows);
}

async function showParticipantModePicker(ctx: BotContext): Promise<void> {
  const t = T(ctx);
  const d = draft(ctx);
  const idx = d.participants.length; // next slot to fill
  const total = d.participantCount!;
  const initiatorId = ctx.from ? String(ctx.from.id) : '';
  const selfAlreadyAdded = d.participantTelegramIds.includes(initiatorId);
  await ctx.reply(t.splitPickParticipantMode(idx + 1, total), {
    parse_mode: 'Markdown',
    ...participantModeKeyboard(t, !selfAlreadyAdded),
  });
}

async function finishParticipantCollection(ctx: BotContext): Promise<void> {
  const t = T(ctx);
  const d = draft(ctx);
  await ctx.reply(t.splitParticipantsDone(d.participants), { parse_mode: 'Markdown' });
  await ctx.reply(t.splitAskBillName, { parse_mode: 'Markdown' });
  ctx.wizard.selectStep(4);
}

export const splitScene = new Scenes.WizardScene<BotContext>(
  'SPLIT',

  // ── Step 0: Ask session name (or jump to bill entry for existing sessions) ──
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    // If entering with an existing session (set by splitMenu handler), jump to bill entry
    if (d.sessionId && d.participants.length > 0) {
      await ctx.reply(t.splitAskBillName, { parse_mode: 'Markdown' });
      ctx.wizard.selectStep(4);
      return;
    }

    ctx.session.splitDraft = {
      participants: [],
      participantTelegramIds: [],
      collectingParticipantIndex: 0,
      bills: [],
      currentBill: {},
      currentShareIndex: 0,
    };

    await ctx.reply(t.splitAskName, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t.splitBtnSkipName, 'split_skip_name')],
        [Markup.button.callback(t.splitBtnCancel, 'split_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // ── Step 1: Receive name / skip → show currency picker ────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;
      if (data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
      if (data === 'split_skip_name') { d.sessionName = undefined; }
    } else if (ctx.message && 'text' in ctx.message) {
      d.sessionName = ctx.message.text.trim() || undefined;
    } else {
      return;
    }

    await ctx.reply(t.splitAskCurrency, { ...currencyKeyboard() });
    return ctx.wizard.next();
  },

  // ── Step 2: Receive currency → ask participant count ───────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;

    if (data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
    if (!data.startsWith('split_currency:')) return;

    d.currency = data.replace('split_currency:', '') as Currency;
    try { await ctx.editMessageText(`✅ Currency: *${currencyLabel(d.currency)}*`, { parse_mode: 'Markdown' }); } catch { /* message may not be editable */ }
    await ctx.reply(t.splitAskParticipantCount, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(t.splitBtnCancel, 'split_cancel')]]),
    });
    return ctx.wizard.next();
  },

  // ── Step 3: 3-mode participant picker ─────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    // ── Callback handling ──
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'split_cancel') { await ctx.reply(t.splitCancelled); return ctx.scene.leave(); }

      // ── Mode selection ──
      if (data === 'split_mode:contact') {
        if (!ctx.from) return;
        const viewer = await findUserByTelegramId(String(ctx.from.id));
        if (!viewer) { await ctx.reply(t.errUserNotFound); return ctx.scene.leave(); }

        const relationships = await getUserRelationships(viewer.id);
        if (relationships.length === 0) {
          await ctx.reply(t.splitNoContacts, { parse_mode: 'Markdown' });
          await showParticipantModePicker(ctx);
          return;
        }

        d.contactsCache = relationships.map(({ contact }) => ({
          telegramId: contact.telegramId,
          displayName: getDisplayName(contact),
        }));
        d.collectingMode = 'contact';

        const selfAlreadyAdded = d.participantTelegramIds.includes(String(ctx.from.id));
        const buttons = d.contactsCache.map((c, i) =>
          [Markup.button.callback(c.displayName, `split_pick_contact:${i}`)],
        );
        if (!selfAlreadyAdded) {
          buttons.push([Markup.button.callback(t.splitBtnMyself, 'split_mode:myself')]);
        }
        buttons.push([Markup.button.callback(t.splitBtnCancel, 'split_cancel')]);

        try {
          await ctx.editMessageText(t.splitPickParticipantMode(d.participants.length + 1, d.participantCount!), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
          });
        } catch {
          await ctx.reply(t.splitPickParticipantMode(d.participants.length + 1, d.participantCount!), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
          });
        }
        return;
      }

      if (data === 'split_mode:telegram') {
        d.collectingMode = 'telegram';
        try {
          await ctx.editMessageText(t.splitEnterTelegramId, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t.splitBtnCancel, 'split_cancel')]]),
          });
        } catch {
          await ctx.reply(t.splitEnterTelegramId, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([[Markup.button.callback(t.splitBtnCancel, 'split_cancel')]]),
          });
        }
        return;
      }

      if (data === 'split_mode:name') {
        d.collectingMode = 'name';
        const idx = d.participants.length;
        try {
          await ctx.editMessageText(t.splitAskParticipantName(idx + 1, d.participantCount!), { parse_mode: 'Markdown' });
        } catch {
          await ctx.reply(t.splitAskParticipantName(idx + 1, d.participantCount!), { parse_mode: 'Markdown' });
        }
        return;
      }

      if (data === 'split_mode:myself') {
        if (!ctx.from) return;
        const selfUser = await findUserByTelegramId(String(ctx.from.id));
        const selfName = selfUser
          ? getDisplayName(selfUser)
          : ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');
        const selfId = String(ctx.from.id);

        d.participants.push(selfName);
        d.participantTelegramIds.push(selfId);
        d.collectingMode = undefined;
        d.collectingParticipantIndex = d.participants.length;

        try { await ctx.editMessageText(`✅ *${selfName}* (you) added.`, { parse_mode: 'Markdown' }); } catch { /* ignore */ }

        if (d.participants.length >= d.participantCount!) {
          return finishParticipantCollection(ctx);
        }
        await showParticipantModePicker(ctx);
        return;
      }

      // ── Contact selected from list ──
      if (data.startsWith('split_pick_contact:')) {
        const contactIdx = parseInt(data.replace('split_pick_contact:', ''), 10);
        const contact = d.contactsCache?.[contactIdx];
        if (!contact) return;

        d.participants.push(contact.displayName);
        d.participantTelegramIds.push(contact.telegramId);
        d.collectingMode = undefined;
        d.contactsCache = undefined;
        d.collectingParticipantIndex = d.participants.length;

        try { await ctx.editMessageText(`✅ *${contact.displayName}* added.`, { parse_mode: 'Markdown' }); } catch { /* ignore */ }

        if (d.participants.length >= d.participantCount!) {
          return finishParticipantCollection(ctx);
        }
        await showParticipantModePicker(ctx);
        return;
      }

      return;
    }

    // ── Text input ──
    if (!ctx.message || !('text' in ctx.message)) return;
    const text = ctx.message.text.trim();

    // ── First message: participant count ──
    if (d.participantCount === undefined) {
      const count = parseInt(text, 10);
      if (isNaN(count) || count < 2 || count > 20) {
        await ctx.reply(t.splitInvalidCount);
        return;
      }
      d.participantCount = count;
      d.participants = [];
      d.participantTelegramIds = [];
      d.collectingParticipantIndex = 0;

      await showParticipantModePicker(ctx);
      return;
    }

    // ── Telegram ID mode ──
    if (d.collectingMode === 'telegram') {
      if (!/^\d+$/.test(text)) {
        await ctx.reply(t.splitEnterTelegramId, { parse_mode: 'Markdown' });
        return;
      }

      const foundUser = await findUserByTelegramId(text);
      if (foundUser) {
        const displayName = getDisplayName(foundUser);
        d.participants.push(displayName);
        d.participantTelegramIds.push(text);
        d.collectingMode = undefined;
        d.collectingParticipantIndex = d.participants.length;

        await ctx.reply(t.splitUserFound(displayName), { parse_mode: 'Markdown' });

        // Notify the found user
        ctx.telegram.sendMessage(
          text,
          t.splitNotifyAddedToSplit(
            ctx.from ? ctx.from.first_name : 'Someone',
            d.sessionName,
          ),
          { parse_mode: 'Markdown' },
        ).catch(() => {});
      } else {
        d.participants.push(`User ${text}`);
        d.participantTelegramIds.push(text);
        d.collectingMode = undefined;
        d.collectingParticipantIndex = d.participants.length;

        await ctx.reply(t.splitUserNotFound, { parse_mode: 'Markdown' });

        // Show an invite link the creator can share
        if (ctx.from) {
          const creatorUser = await findUserByTelegramId(String(ctx.from.id));
          if (creatorUser) {
            const inviteLink = generateInviteLink(creatorUser.id);
            await ctx.reply(`\`${inviteLink}\``, { parse_mode: 'Markdown' });
          }
        }
      }

      if (d.participants.length >= d.participantCount!) {
        return finishParticipantCollection(ctx);
      }
      await showParticipantModePicker(ctx);
      return;
    }

    // ── Name mode ──
    if (d.collectingMode === 'name') {
      if (!text) return;
      d.participants.push(text);
      d.participantTelegramIds.push('');
      d.collectingMode = undefined;
      d.collectingParticipantIndex = d.participants.length;

      if (d.participants.length >= d.participantCount!) {
        return finishParticipantCollection(ctx);
      }
      await showParticipantModePicker(ctx);
      return;
    }
  },

  // ── Step 4: Ask bill name ──────────────────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    const name = ctx.message.text.trim();
    if (!name) return;

    d.currentBill = { name };
    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    await ctx.reply(t.splitAskBillAmount(sym), { parse_mode: 'Markdown' });
    return ctx.wizard.next();
  },

  // ── Step 5: Receive amount → show payer buttons ────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    const amount = parseFloat(ctx.message.text.trim());
    if (isNaN(amount) || amount <= 0) { await ctx.reply(t.splitInvalidAmount); return; }

    d.currentBill.totalAmount = amount;
    await ctx.reply(t.splitAskPayer, {
      parse_mode: 'Markdown',
      ...payerKeyboard(d.participants),
    });
    return ctx.wizard.next();
  },

  // ── Step 6: Receive payer → show split type ────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;

    if (data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
    if (!data.startsWith('split_payer:')) return;

    d.currentBill.paidByIndex = parseInt(data.replace('split_payer:', ''), 10);
    try { await ctx.editMessageText(t.splitAskSplitType, { ...splitTypeKeyboard(t) }); } catch { await ctx.reply(t.splitAskSplitType, { ...splitTypeKeyboard(t) }); }
    return ctx.wizard.next();
  },

  // ── Step 7: Receive split type → EQUAL saves, others start share loop ──────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;

    if (data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }
    if (!data.startsWith('split_type:')) return;

    const splitType = data.replace('split_type:', '') as 'EQUAL' | 'PERCENTAGE' | 'CUSTOM';
    d.currentBill.splitType = splitType;

    if (splitType === 'EQUAL') {
      const shares = computeEqualShares(
        d.currentBill.totalAmount!,
        d.participants.length,
        d.currency ?? Currency.USD,
      );
      d.currentBill.shares = shares;
      d.bills.push(d.currentBill as BillDraft);
      d.currentBill = {};
      try { await ctx.editMessageText('✅ Split equally.', { parse_mode: 'Markdown' }); } catch { /* ignore */ }
      return showBillSummary(ctx);
    }

    // PERCENTAGE or CUSTOM — start collecting per-person shares
    d.currentBill.shares = [];
    d.currentShareIndex = 0;
    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    const isPercent = splitType === 'PERCENTAGE';
    const remaining = isPercent ? '100' : d.currentBill.totalAmount!.toFixed(2);
    try {
      await ctx.editMessageText(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: 'Markdown' });
    }
    return ctx.wizard.selectStep(8);
  },

  // ── Step 8: Per-person share collection loop ───────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'split_cancel') { await ctx.reply(t.splitCancelled); return ctx.scene.leave(); }
      return;
    }

    if (!ctx.message || !('text' in ctx.message)) return;
    const val = parseFloat(ctx.message.text.trim());
    if (isNaN(val) || val < 0) { await ctx.reply(t.splitInvalidAmount); return; }

    d.currentBill.shares!.push(val);
    d.currentShareIndex++;

    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    const isPercent = d.currentBill.splitType === 'PERCENTAGE';
    const collectedSum = d.currentBill.shares!.reduce((a, b) => a + b, 0);

    if (d.currentShareIndex < d.participants.length) {
      const remaining = isPercent
        ? (100 - collectedSum).toFixed(2)
        : (d.currentBill.totalAmount! - collectedSum).toFixed(2);
      await ctx.reply(
        t.splitAskShare(d.participants[d.currentShareIndex], sym, remaining, isPercent),
        { parse_mode: 'Markdown' },
      );
      return; // stay at step 8
    }

    // All shares collected — validate
    const expected = isPercent ? 100 : d.currentBill.totalAmount!;
    const EPSILON = 0.01;
    if (Math.abs(collectedSum - expected) > EPSILON) {
      await ctx.reply(t.splitShareValidationError(collectedSum.toFixed(2), expected.toFixed(2), isPercent));
      // reset shares, restart collection
      d.currentBill.shares = [];
      d.currentShareIndex = 0;
      const remaining = isPercent ? '100' : d.currentBill.totalAmount!.toFixed(2);
      await ctx.reply(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: 'Markdown' });
      return;
    }

    // Convert percentages to amounts
    if (isPercent) {
      d.currentBill.shares = d.currentBill.shares!.map((pct) =>
        Math.round((pct / 100) * d.currentBill.totalAmount! * 100) / 100,
      );
    }

    d.bills.push(d.currentBill as BillDraft);
    d.currentBill = {};
    return showBillSummary(ctx);
  },

  // ── Step 9: Bill summary — Add Another or Calculate ─────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;

    if (data === 'split_cancel') { await ctx.editMessageText(t.splitCancelled); return ctx.scene.leave(); }

    if (data === 'split_add_another') {
      try { await ctx.editMessageText(t.splitAskBillName, { parse_mode: 'Markdown' }); } catch { await ctx.reply(t.splitAskBillName, { parse_mode: 'Markdown' }); }
      d.currentBill = {};
      return ctx.wizard.selectStep(4);
    }

    if (data !== 'split_calculate') return;

    // ── Calculate ──
    if (!ctx.from) return;
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (!viewer) { await ctx.reply(t.errUserNotFound); return ctx.scene.leave(); }

    try {
      let targetSessionId: string;

      if (d.sessionId) {
        // Existing session — add new bills only, then recalculate
        targetSessionId = d.sessionId;
        for (const bill of d.bills) {
          await addBillToSession(targetSessionId, {
            name: bill.name,
            totalAmount: bill.totalAmount,
            paidByIndex: bill.paidByIndex,
            splitType: bill.splitType as any,
            shares: bill.shares,
          });
        }
      } else {
        // New session — create and add all bills
        const session = await createDraftSession(
          viewer.id,
          d.sessionName,
          d.currency ?? Currency.USD,
          d.participants,
          d.participantTelegramIds,
        );
        targetSessionId = session.id;
        for (const bill of d.bills) {
          await addBillToSession(targetSessionId, {
            name: bill.name,
            totalAmount: bill.totalAmount,
            paidByIndex: bill.paidByIndex,
            splitType: bill.splitType as any,
            shares: bill.shares,
          });
        }
      }

      const { netBalances, transfers, shareToken } = await calculateSession(targetSessionId);
      d.sessionId = targetSessionId;
      d.netBalances = netBalances;
      d.shareToken = shareToken;

      if (ctx.from) {
        const creatorTelegramId = String(ctx.from.id);
        const creatorUser = await findOrCreateUser(
          creatorTelegramId,
          ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''),
          ctx.from.username,
        );
        notifySplitParticipants({
          telegram: ctx.telegram,
          sessionName: d.sessionName ?? null,
          currency: d.currency ?? Currency.USD,
          participants: d.participants,
          participantTelegramIds: d.participantTelegramIds,
          netBalances,
          transfers,
          shareToken,
          creatorName: getDisplayName(creatorUser),
          creatorTelegramId,
        }).catch(() => {});
      }

      const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
      const bankAccounts = await getBankAccountsForParticipants(d.participants, d.participantTelegramIds);
      const balanceMsg = t.splitBalanceSummary(d.participants, netBalances, sym);
      const balanceKeyboard = Markup.inlineKeyboard([[Markup.button.callback(t.splitBtnSettlementPlan, 'split_show_plan')]]);
      try {
        await ctx.editMessageText(balanceMsg, { parse_mode: 'Markdown', ...balanceKeyboard });
      } catch {
        await ctx.reply(balanceMsg, { parse_mode: 'Markdown', ...balanceKeyboard });
      }
    } catch (err) {
      console.error('Split calculate error:', err);
      await ctx.reply(t.errSomethingWrong);
      return ctx.scene.leave();
    }
    return ctx.wizard.next();
  },

  // ── Step 10: Show settlement plan ─────────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    if (ctx.callbackQuery.data !== 'split_show_plan') return;

    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    const netBalances = d.netBalances ?? computeNetBalances(d.participants, d.bills);
    const transfers = simplifyDebts(d.participants, netBalances, d.currency ?? Currency.USD);
    const bankAccounts = await getBankAccountsForParticipants(d.participants, d.participantTelegramIds);

    const planMsg = t.splitSettlementPlan(transfers, sym, bankAccounts);
    const shareKeyboard = Markup.inlineKeyboard([[Markup.button.callback(t.splitBtnShare, 'split_share')]]);
    try {
      await ctx.editMessageText(planMsg, { parse_mode: 'Markdown', ...shareKeyboard });
    } catch {
      await ctx.reply(planMsg, { parse_mode: 'Markdown', ...shareKeyboard });
    }
    return ctx.wizard.next();
  },

  // ── Step 11: Share link ─────────────────────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = draft(ctx);

    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    if (ctx.callbackQuery.data !== 'split_share') return;

    const token = d.shareToken;
    if (!token) { await ctx.reply(t.errSomethingWrong); return ctx.scene.leave(); }

    if (d.sessionId) await markSessionShared(d.sessionId);

    const link = `https://t.me/${BOT_USERNAME}?start=split_${token}`;
    try { await ctx.editMessageText(t.splitShareLink(link, d.sessionName ?? null), { parse_mode: 'Markdown' }); } catch { await ctx.reply(t.splitShareLink(link, d.sessionName ?? null), { parse_mode: 'Markdown' }); }

    // Send per-participant invite links for unknown participants
    if (d.sessionId) {
      const invites = await prisma.splitParticipantInvite.findMany({ where: { splitSessionId: d.sessionId } });
      if (invites.length > 0) {
        const links = invites.map((inv) => ({
          name: d.participants[inv.participantIndex] ?? `Participant ${inv.participantIndex + 1}`,
          url: `https://t.me/${BOT_USERNAME}?start=splitjoin_${inv.token}`,
        }));
        await ctx.reply(t.splitUnknownParticipantLinks(links), { parse_mode: 'Markdown' });
      }
    }

    ctx.session.splitDraft = undefined;
    return ctx.scene.leave();
  },
);

async function showBillSummary(ctx: BotContext): Promise<void> {
  const t = T(ctx);
  const d = draft(ctx);
  const sym = currencySymbol(d.currency ?? Currency.USD);
  const billList = d.bills.map((b) => ({
    name: b.name,
    totalAmount: b.totalAmount,
    paidBy: d.participants[b.paidByIndex] ?? '?',
  }));

  await ctx.reply(t.splitBillSummary(billList, sym), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(t.splitBtnAddBill, 'split_add_another')],
      [Markup.button.callback(t.splitBtnCalculate, 'split_calculate')],
      [Markup.button.callback(t.splitBtnCancel, 'split_cancel')],
    ]),
  });
  ctx.wizard.selectStep(9);
}
