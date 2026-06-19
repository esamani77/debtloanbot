import { Scenes, Markup } from "telegraf";
import { SplitType, Currency } from "@prisma/client";
import { BotContext } from "../../models/types";
import { useT } from "../../i18n";
import { currencySymbol } from "../../utils/currency";
import { computeEqualShares } from "../../utils/debtSimplification";
import { updateBillInSession, getSessionById } from "../../services/splitService";
import { normalizeDigits } from "../../utils/digits";
import { openSplitSession } from "../commands/splitMenu";

export const EDIT_BILL = "EDIT_BILL";

const T = (ctx: BotContext) => useT(ctx.session.userLanguage);

function payerKeyboard(participants: string[]) {
  return Markup.inlineKeyboard(
    participants.map((p, i) => Markup.button.callback(p, `eb_payer:${i}`)),
    { columns: 2 },
  );
}

function splitTypeKeyboard(t: ReturnType<typeof useT>) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t.splitBtnEqual, "eb_type:EQUAL")],
    [Markup.button.callback(t.splitBtnByPercentage, "eb_type:PERCENTAGE")],
    [Markup.button.callback(t.splitBtnCustomAmount, "eb_type:CUSTOM")],
  ]);
}

export const editBillScene = new Scenes.WizardScene<BotContext>(
  EDIT_BILL,

  // ── Step 0: Enter scene — show current bill name, ask for new name ──────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft;
    if (!d?.currentBill?.name) {
      await ctx.reply("❌ No bill selected.");
      return ctx.scene.leave();
    }
    await ctx.reply(t.splitEditBillAskName(d.currentBill.name), { parse_mode: "Markdown" });
    return ctx.wizard.next();
  },

  // ── Step 1: Receive name → ask amount ───────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft!;
    if (!ctx.message || !("text" in ctx.message)) return;
    const name = ctx.message.text.trim();
    if (!name) return;
    d.currentBill.name = name;

    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    await ctx.reply(t.splitAskBillAmount(sym), { parse_mode: "Markdown" });
    return ctx.wizard.next();
  },

  // ── Step 2: Receive amount → ask payer ──────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft!;
    if (!ctx.message || !("text" in ctx.message)) return;
    const amount = parseFloat(normalizeDigits(ctx.message.text.trim()).replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(t.splitInvalidAmount);
      return;
    }
    d.currentBill.totalAmount = amount;
    await ctx.reply(t.splitAskPayer, { parse_mode: "Markdown", ...payerKeyboard(d.participants) });
    return ctx.wizard.next();
  },

  // ── Step 3: Receive payer → ask split type ───────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft!;
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("eb_payer:")) return;
    d.currentBill.paidByIndex = parseInt(data.replace("eb_payer:", ""), 10);
    try {
      await ctx.editMessageText(t.splitAskSplitType, { ...splitTypeKeyboard(t) });
    } catch {
      await ctx.reply(t.splitAskSplitType, { ...splitTypeKeyboard(t) });
    }
    return ctx.wizard.next();
  },

  // ── Step 4: Receive split type ───────────────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft!;
    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) return;
    await ctx.answerCbQuery();
    const data = ctx.callbackQuery.data;
    if (!data.startsWith("eb_type:")) return;

    const splitType = data.replace("eb_type:", "") as SplitType;
    d.currentBill.splitType = splitType;

    if (splitType === "EQUAL") {
      d.currentBill.shares = computeEqualShares(
        d.currentBill.totalAmount!,
        d.participants.length,
        d.currency ?? Currency.USD,
      );
      return saveAndFinish(ctx);
    }

    // PERCENTAGE or CUSTOM — collect shares
    d.currentBill.shares = [];
    d.currentShareIndex = 0;
    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    const isPercent = splitType === "PERCENTAGE";
    const remaining = isPercent ? "100" : d.currentBill.totalAmount!.toFixed(2);
    try {
      await ctx.editMessageText(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: "Markdown" });
    } catch {
      await ctx.reply(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: "Markdown" });
    }
    return ctx.wizard.next();
  },

  // ── Step 5: Per-person share collection ──────────────────────────────────────
  async (ctx) => {
    const t = T(ctx);
    const d = ctx.session.splitDraft!;
    if (!ctx.message || !("text" in ctx.message)) return;

    const val = parseFloat(normalizeDigits(ctx.message.text.trim()).replace(/,/g, ''));
    if (isNaN(val) || val < 0) {
      await ctx.reply(t.splitInvalidAmount);
      return;
    }

    d.currentBill.shares!.push(val);
    d.currentShareIndex++;

    const sym = currencySymbol(d.currency ?? Currency.USD, ctx.session.userLanguage);
    const isPercent = d.currentBill.splitType === "PERCENTAGE";
    const collectedSum = d.currentBill.shares!.reduce((a, b) => a + b, 0);

    if (d.currentShareIndex < d.participants.length) {
      const remaining = isPercent
        ? (100 - collectedSum).toFixed(2)
        : (d.currentBill.totalAmount! - collectedSum).toFixed(2);
      await ctx.reply(t.splitAskShare(d.participants[d.currentShareIndex], sym, remaining, isPercent), { parse_mode: "Markdown" });
      return;
    }

    const expected = isPercent ? 100 : d.currentBill.totalAmount!;
    if (Math.abs(collectedSum - expected) > 0.01) {
      await ctx.reply(t.splitShareValidationError(collectedSum.toFixed(2), expected.toFixed(2), isPercent));
      d.currentBill.shares = [];
      d.currentShareIndex = 0;
      const remaining = isPercent ? "100" : d.currentBill.totalAmount!.toFixed(2);
      await ctx.reply(t.splitAskShare(d.participants[0], sym, remaining, isPercent), { parse_mode: "Markdown" });
      return;
    }

    if (isPercent) {
      d.currentBill.shares = d.currentBill.shares!.map(
        (pct) => Math.round((pct / 100) * d.currentBill.totalAmount! * 100) / 100,
      );
    }

    return saveAndFinish(ctx);
  },
);

async function saveAndFinish(ctx: BotContext) {
  const t = T(ctx);
  const d = ctx.session.splitDraft!;
  const billId = ctx.session.editBillId;
  const sessionId = d.sessionId;

  if (!billId || !sessionId) {
    await ctx.reply("❌ Missing bill or session info.");
    return ctx.scene.leave();
  }

  try {
    await updateBillInSession(sessionId, billId, {
      name: d.currentBill.name!,
      totalAmount: d.currentBill.totalAmount!,
      paidByIndex: d.currentBill.paidByIndex!,
      splitType: d.currentBill.splitType as SplitType,
      shares: d.currentBill.shares!,
    });
  } catch {
    await ctx.reply(t.splitBillDeleteFailed);
    return ctx.scene.leave();
  }

  ctx.session.editBillId = undefined;
  d.currentBill = {};

  await ctx.reply(`✅ ${t.splitBtnEditBills.replace('✏️ ', '')} — bill updated!`);
  await ctx.scene.leave();

  // Re-show session detail
  const session = await getSessionById(sessionId);
  if (session) {
    const sym = currencySymbol(session.currency, ctx.session.userLanguage);
    const detail = t.splitSessionDetail(
      session.name,
      session.currency,
      session.participants,
      session.bills.length,
      session.status,
      sym,
    );
    await ctx.reply(detail, { parse_mode: "Markdown" });
    await openSplitSession(ctx, sessionId);
  }
}
