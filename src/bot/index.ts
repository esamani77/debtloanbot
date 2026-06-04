import { Telegraf, Scenes, session, Markup } from "telegraf";
import { Currency, Language } from "@prisma/client";
import { BotContext, SessionData } from "../models/types";
import { addTransactionScene } from "./scenes/addTransaction";
import { bankAccountScene } from "./scenes/bankAccount";
import { nicknameSetupScene } from "./scenes/nicknameSetup";
import { feedbackScene } from "./scenes/feedbackScene";
import { splitScene } from "./scenes/splitScene";
import { editTransactionScene } from "./scenes/editTransaction";
import { startHandler } from "./commands/start";
import { inviteHandler } from "./commands/invite";
import { contactsHandler } from "./commands/contacts";
import { selectContactAction } from "./commands/select";
import { balanceHandler } from "./commands/balance";
import { logsHandler } from "./commands/logs";
import { helpHandler } from "./commands/help";
import { showCurrencyPicker, setCurrencyAction } from "./commands/currency";
import { setLangAction } from "./commands/language";
import { profileHandler } from "./commands/profile";
import { splitHandler } from "./commands/split";
import { splitsHandler } from "./commands/splits";
import { settleAllHandler } from "./commands/settle";
import { remindHandler, handleRemindSend } from "./commands/remind";
import { recurringHandler } from "./commands/recurring";
import { expensesHandler } from "./commands/expenses";
import {
  cancelRecurringTransaction,
  getRecurringTransactionById,
} from "../services/recurringTransactionService";
import {
  splitMenuHandler,
  openSplitSession,
  addBillToExistingSession,
  recalculateSession,
  reshareSession,
} from "./commands/splitMenu";
import {
  bankAccountsHandler,
  handleDeleteConfirm,
  handleDeleteExecute,
  withdrawalInfoHandler,
} from "./commands/bankAccounts";
import {
  getBankAccountById,
  getUserBankAccounts,
} from "../services/bankAccountService";
import {
  findUserByTelegramId,
  findOrCreateUser,
  getDisplayName,
} from "../services/userService";
import {
  getDraftSession,
  deleteSession,
  getSessionById,
  getSessionByToken,
  getBankAccountsForParticipants,
  joinSession,
  isSessionMember,
} from "../services/splitService";
import { computeNetBalances, simplifyDebts } from "../utils/debtSimplification";
import { currencySymbol as currSym } from "../utils/currency";
import { getRelationshipBetween } from "../services/relationshipService";
import {
  getBalance,
  getTransactionById,
  deleteTransaction as deleteTransactionService,
  settleTransaction as settleTransactionService,
  settleAllTransactions as settleAllService,
} from "../services/transactionService";
import { currencySymbol } from "../utils/currency";
import { useT } from "../i18n";
import { en } from "../i18n/en";
import { fa } from "../i18n/fa";
import { Sentry } from "../sentry";

import {
  settlementReqCooldowns,
  SETTLEMENT_REQ_COOLDOWN_MS,
} from "./settlementCooldown";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN environment variable is required.");
}

export const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Session middleware — must be before everything else
bot.use(
  session({
    defaultSession: (): SessionData => ({
      __scenes: { cursor: 0 },
      activeContactId: undefined,
      activeContactName: undefined,
      userLanguage: undefined,
      pendingInvite: undefined,
      feedbackTargetTelegramId: undefined,
      feedbackTargetName: undefined,
    }),
  }),
);

// Language loader middleware — populates session.userLanguage and keeps username in sync
bot.use(async (ctx, next) => {
  if (ctx.from) {
    const telegramId = String(ctx.from.id);
    const name =
      ctx.from.first_name +
      (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");
    const username = ctx.from.username ?? undefined;
    const user = await findOrCreateUser(telegramId, name, username);
    if (!ctx.session.userLanguage) ctx.session.userLanguage = user.language;
  }
  return next();
});

// Force-join middleware — blocks users who haven't joined both required channels
const REQUIRED_CHANNELS = (process.env.REQUIRED_CHANNELS ?? "@debtmate")
  .split(",")
  .map((ch) => ch.trim())
  .filter(Boolean);

const JOINED_STATUSES = ["member", "administrator", "creator"];

async function getMissingChannels(
  ctx: BotContext,
  userId: number,
): Promise<string[]> {
  const missing: string[] = [];
  for (const channel of REQUIRED_CHANNELS) {
    try {
      const member = await ctx.telegram.getChatMember(channel, userId);
      if (!JOINED_STATUSES.includes(member.status)) missing.push(channel);
    } catch {
      // Can't check — skip this channel
    }
  }
  return missing;
}

function buildJoinKeyboard(missing: string[]) {
  const joinButtons = missing.map((ch) =>
    Markup.button.url(
      `📢 Join ${ch.startsWith("@") ? ch : "Channel"}`,
      `https://t.me/${ch.replace("@", "")}`,
    ),
  );
  return Markup.inlineKeyboard([
    joinButtons,
    [Markup.button.callback("✅ I Joined", "check_membership")],
  ]);
}

bot.use(async (ctx, next) => {
  if (
    !ctx.from ||
    ctx.updateType === "channel_post" ||
    REQUIRED_CHANNELS.length === 0
  ) {
    return next();
  }

  // Allow the check_membership callback to pass through so users can re-verify
  if (
    ctx.updateType === "callback_query" &&
    "data" in ctx.callbackQuery! &&
    ctx.callbackQuery.data === "check_membership"
  ) {
    return next();
  }

  const missing = await getMissingChannels(ctx, ctx.from.id);
  if (missing.length === 0) return next();

  await ctx.reply(
    `⚠️ To use this bot you must join ${missing.length > 1 ? "both channels" : "our channel"} first:`,
    buildJoinKeyboard(missing),
  );
});

// Stage (scene) middleware
const stage = new Scenes.Stage<BotContext>([
  addTransactionScene,
  bankAccountScene,
  nicknameSetupScene,
  feedbackScene,
  splitScene,
  editTransactionScene,
]);
bot.use(stage.middleware());

// Command handlers
bot.start(async (ctx) => {
  const payload =
    (ctx as BotContext & { startPayload?: string }).startPayload ?? "";

  if (payload.startsWith("connect_")) {
    if (!ctx.from) return;
    const token = payload.slice(8);
    const { completeTelegramConnect } = await import("../services/authService");
    const result = await completeTelegramConnect(
      token,
      String(ctx.from.id),
      ctx.from.first_name +
        (ctx.from.last_name ? ` ${ctx.from.last_name}` : ""),
    );
    await ctx.reply(result.message);
    return;
  }

  if (payload.startsWith("edit_")) {
    const txId = payload.slice(5);
    if (!ctx.from) return;
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const tx = await getTransactionById(txId);
    if (!tx) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (
      !viewer ||
      (tx.relationship.userAId !== viewer.id &&
        tx.relationship.userBId !== viewer.id)
    ) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    await ctx.scene.enter("EDIT_TRANSACTION", {
      txId,
      viewerId: viewer.id,
      currentAmount: tx.amount,
      currentNote: tx.note,
      currentType: tx.type,
      currency: tx.relationship.currency,
    });
    return;
  }

  if (payload.startsWith("del_")) {
    const txId = payload.slice(4);
    if (!ctx.from) return;
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const tx = await getTransactionById(txId);
    if (!tx) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (
      !viewer ||
      (tx.relationship.userAId !== viewer.id &&
        tx.relationship.userBId !== viewer.id)
    ) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    const typeLabel = tx.type === "LOAN" ? T.logLoan : T.logDebt;
    const sym = currencySymbol(
      tx.relationship.currency,
      ctx.session.userLanguage,
    );
    await ctx.reply(T.txDeleteConfirm(typeLabel, sym, tx.amount.toFixed(2)), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            T.txDeleteConfirmBtn,
            `tx_delete_confirm:${txId}`,
          ),
        ],
        [Markup.button.callback(T.btnCancel, "tx_delete_cancel")],
      ]),
    });
    return;
  }

  if (payload.startsWith("settle_")) {
    const txId = payload.slice(7);
    if (!ctx.from) return;
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const tx = await getTransactionById(txId);
    if (!tx) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    if (tx.isSettled) {
      await ctx.reply(T.txSettled);
      return;
    }
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (
      !viewer ||
      (tx.relationship.userAId !== viewer.id &&
        tx.relationship.userBId !== viewer.id)
    ) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }
    const typeLabel = tx.type === "LOAN" ? T.logLoan : T.logDebt;
    const sym = currencySymbol(
      tx.relationship.currency,
      ctx.session.userLanguage,
    );
    await ctx.reply(T.txSettleConfirm(typeLabel, sym, tx.amount.toFixed(2)), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(
            T.txSettleConfirmBtn,
            `tx_settle_confirm:${txId}`,
          ),
        ],
        [Markup.button.callback(T.btnCancel, "settle_cancel")],
      ]),
    });
    return;
  }

  await startHandler(ctx);
});
bot.command("invite", inviteHandler);
bot.command("contacts", contactsHandler);
bot.command("balance", balanceHandler);
bot.command("add", (ctx) => ctx.scene.enter("ADD_TRANSACTION"));
bot.command("logs", logsHandler);
bot.command("help", helpHandler);
bot.command("accounts", bankAccountsHandler);
bot.command("profile", profileHandler);
bot.command("split", splitHandler);
bot.command("splits", splitsHandler);
bot.command("settle", settleAllHandler);
bot.command("remind", remindHandler);
bot.command("recurring", recurringHandler);
bot.command("expenses", expensesHandler);

// Language selection via ReplyKeyboard
bot.hears("🇬🇧 English", async (ctx) => setLangAction(ctx, Language.EN));
bot.hears("🇮🇷 فارسی", async (ctx) => setLangAction(ctx, Language.FA));

bot.action("change_lang", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    "🌐 Choose your language:\n\nزبان خود را انتخاب کنید:",
    Markup.keyboard([
      [Markup.button.text("🇬🇧 English"), Markup.button.text("🇮🇷 فارسی")],
    ])
      .resize()
      .oneTime(),
  );
});

// Main menu ReplyKeyboard handlers
bot.hears([en.btnContacts, fa.btnContacts], async (ctx) =>
  contactsHandler(ctx),
);
bot.hears([en.btnInviteFriend, fa.btnInviteFriend], async (ctx) =>
  inviteHandler(ctx),
);
bot.hears([en.btnHelp, fa.btnHelp], async (ctx) => helpHandler(ctx));
bot.hears([en.btnAdd, fa.btnAdd], async (ctx) =>
  ctx.scene.enter("ADD_TRANSACTION"),
);
bot.hears([en.btnProfile, fa.btnProfile], async (ctx) => profileHandler(ctx));
bot.hears([en.btnSplit, fa.btnSplit], async (ctx) => splitMenuHandler(ctx));
bot.hears([en.btnExpenses, fa.btnExpenses], async (ctx) =>
  expensesHandler(ctx),
);

// Contact selection
bot.action(/^select_contact:(.+)$/, selectContactAction);

// Currency
bot.action("set_currency", async (ctx) => {
  await ctx.answerCbQuery();
  await showCurrencyPicker(ctx);
});

bot.action(/^set_currency:(.+)$/, async (ctx) => {
  await setCurrencyAction(ctx, ctx.match[1] as Currency);
});

// Back to contact detail menu
bot.action("go_back_contact", async (ctx) => {
  await ctx.answerCbQuery();
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const contactName = ctx.session.activeContactName ?? "?";
  const contactId = ctx.session.activeContactId ?? "";
  await ctx.editMessageText(T.selectActiveContact(contactName), {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(T.btnBalance, "view_balance"),
        Markup.button.callback(T.btnLogs, "view_logs"),
      ],
      [Markup.button.callback(T.btnAdd, "add_transaction")],
      {
        ...Markup.button.callback(T.btnWithdrawalInfo, "view_withdrawal"),
        style: "primary",
      } as any,
      [Markup.button.callback(T.btnSetCurrency, "set_currency")],
      [Markup.button.callback(T.btnBackContacts, "go_contacts")],
    ]),
  });
});

// Navigation
bot.action("go_contacts", async (ctx) => {
  await ctx.answerCbQuery();
  await contactsHandler(ctx);
});

bot.action("get_invite_link", async (ctx) => {
  await ctx.answerCbQuery();
  await inviteHandler(ctx);
});

bot.action("show_help", async (ctx) => {
  await ctx.answerCbQuery();
  await helpHandler(ctx);
});

bot.action("view_balance", async (ctx) => {
  await ctx.answerCbQuery();
  await balanceHandler(ctx);
});

bot.action("view_logs", async (ctx) => {
  await ctx.answerCbQuery();
  await logsHandler(ctx);
});

bot.action("add_transaction", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("ADD_TRANSACTION");
});

// Profile
bot.action("view_profile", async (ctx) => {
  await ctx.answerCbQuery();
  await profileHandler(ctx);
});

bot.action("edit_nickname", async (ctx) => {
  await ctx.answerCbQuery();
  const name = ctx.from?.first_name ?? "";
  await ctx.scene.enter("NICKNAME_SETUP", { telegramName: name, mode: "edit" });
});

// Bank accounts
bot.action("go_accounts", async (ctx) => {
  await ctx.answerCbQuery();
  await bankAccountsHandler(ctx);
});

bot.action("acct_add", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("BANK_ACCOUNT", { mode: "add" });
});

bot.action(/^acct_edit:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const accountId = ctx.match[1];
  const account = await getBankAccountById(accountId);
  if (!account) {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    await ctx.reply(T.errSomethingWrong);
    return;
  }
  await ctx.scene.enter("BANK_ACCOUNT", {
    mode: "edit",
    editId: accountId,
    prefillName: account.name,
    prefillCardNumber: account.cardNumber,
    prefillAccountNumber: account.accountNumber,
    prefillBankName: account.bankName,
  });
});

bot.action(/^acct_delete:(.+)$/, async (ctx) => {
  await handleDeleteConfirm(ctx, ctx.match[1]);
});

bot.action(/^acct_delete_confirm:(.+)$/, async (ctx) => {
  await handleDeleteExecute(ctx, ctx.match[1]);
});

// Withdrawal info for a contact
bot.action(/^view_withdrawal:(.+)$/, async (ctx) => {
  await withdrawalInfoHandler(ctx, ctx.match[1]);
});

// Feedback on transaction notification
bot.action(/^tx_feedback:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const viewerTelegramId = ctx.match[1];
  const viewer = await findUserByTelegramId(viewerTelegramId);
  // Store in session — wizard.state from ctx.scene.enter doesn't reliably persist between steps
  ctx.session.feedbackTargetTelegramId = viewerTelegramId;
  ctx.session.feedbackTargetName = viewer?.name ?? "?";
  await ctx.scene.enter("FEEDBACK");
});

// Manual debt reminder (nudge)
bot.action(/^remind_send:(\d+)$/, async (ctx) => {
  await handleRemindSend(ctx, ctx.match[1]);
});

// Settlement request
bot.action(/^settlement_req:(\d+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const debtorTelegramId = ctx.match[1];
  const viewerTelegramId = String(ctx.from.id);
  const viewerName =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

  const cooldownKey = `${viewerTelegramId}:${debtorTelegramId}`;
  const lastSent = settlementReqCooldowns.get(cooldownKey);
  if (lastSent && Date.now() - lastSent < SETTLEMENT_REQ_COOLDOWN_MS) {
    const hoursLeft = Math.ceil(
      (SETTLEMENT_REQ_COOLDOWN_MS - (Date.now() - lastSent)) / (60 * 60 * 1000),
    );
    await ctx.reply(T.settlementRequestCooldown(hoursLeft), {
      parse_mode: "Markdown",
    });
    return;
  }

  try {
    const viewer = await findOrCreateUser(viewerTelegramId, viewerName);
    const debtor = await findUserByTelegramId(debtorTelegramId);
    if (!debtor) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }

    const relationship = await getRelationshipBetween(viewer.id, debtor.id);
    if (!relationship) {
      await ctx.reply(T.errSomethingWrong);
      return;
    }

    const { amount, direction } = await getBalance(relationship.id, viewer.id);
    if (direction !== "owed") {
      await ctx.reply(T.errSomethingWrong);
      return;
    }

    const accounts = await getUserBankAccounts(viewer.id);
    if (accounts.length === 0) {
      ctx.session.pendingSettlementDebtorId = debtorTelegramId;
      await ctx.reply(T.settlementReqNoBankAccount, { parse_mode: "Markdown" });
      await ctx.scene.enter("BANK_ACCOUNT", { mode: "add" });
      return;
    }

    const acct = accounts[0];
    const debtorT = useT(debtor.language);
    const sym = currencySymbol(relationship.currency, debtor.language);
    const senderName = viewer.nickname ?? viewer.name;

    await ctx.telegram
      .sendMessage(
        debtorTelegramId,
        debtorT.settlementRequestReceivedWithAccount(
          senderName,
          sym,
          amount.toFixed(2),
          acct.bankName,
          acct.cardNumber,
          acct.accountNumber,
        ),
        { parse_mode: "Markdown" },
      )
      .catch(() => {});

    settlementReqCooldowns.set(cooldownKey, Date.now());

    await ctx.reply(T.settlementRequestSent(debtor.nickname ?? debtor.name), {
      parse_mode: "Markdown",
    });
  } catch {
    await ctx.reply(T.errSomethingWrong);
  }
});

// Membership re-check
bot.action("check_membership", async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;

  const missing = await getMissingChannels(ctx, ctx.from.id);
  if (missing.length === 0) {
    await ctx.editMessageText("✅ Verified! You can now use the bot.");
  } else {
    await ctx.editMessageReplyMarkup(buildJoinKeyboard(missing).reply_markup);
    await ctx.answerCbQuery(
      missing.length > 1
        ? "❌ You have not joined all channels yet!"
        : "❌ You have not joined yet!",
      { show_alert: true },
    );
  }
});

// Split — resume / start new draft
bot.action(/^split_resume:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("SPLIT");
});

bot.action(/^split_new:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const draftId = ctx.match[1];
  try {
    await deleteSession(draftId);
  } catch {
    /* ignore */
  }
  await ctx.scene.enter("SPLIT");
});

// Split menu — new session
bot.action("split_menu_new", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter("SPLIT");
});

// Split menu — open existing session detail
bot.action(/^split_open:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await openSplitSession(ctx, ctx.match[1]);
});

// Split — add bill to existing session
bot.action(/^split_add_bill:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await addBillToExistingSession(ctx, ctx.match[1]);
});

// Split — recalculate existing session
bot.action(/^split_recalculate:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await recalculateSession(ctx, ctx.match[1]);
});

// Split — reshare existing session
bot.action(/^split_reshare:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await reshareSession(ctx, ctx.match[1]);
});

// Split — join via share link
bot.action(/^split_join:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;

  const sessionId = ctx.match[1];
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");
  const BOT_USERNAME = process.env.BOT_USERNAME ?? "debt_mate_bot";
  const openButton = Markup.inlineKeyboard([
    [
      Markup.button.url(
        T.splitJoinOpenBtn,
        `https://t.me/${BOT_USERNAME}/debtmate`,
      ),
    ],
  ]);

  try {
    const viewer = await findOrCreateUser(telegramId, name, ctx.from.username);
    const sess = await getSessionById(sessionId);
    if (!sess) {
      await ctx.reply(T.splitSessionNotFound, { parse_mode: "Markdown" });
      return;
    }

    if (isSessionMember(sess, viewer.id)) {
      await ctx.editMessageReplyMarkup(openButton.reply_markup).catch(() => {});
      await ctx.reply(T.splitAlreadyJoined, {
        parse_mode: "Markdown",
        ...openButton,
      });
      return;
    }

    await joinSession(sessionId, viewer.id);
    await ctx.editMessageReplyMarkup(openButton.reply_markup).catch(() => {});
    await ctx.reply(T.splitJoinSuccess(sess.name ?? null), {
      parse_mode: "Markdown",
      ...openButton,
    });
  } catch {
    await ctx.reply(T.errSomethingWrong);
  }
});

// Delete confirmation callback
bot.action(/^tx_delete_confirm:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const txId = ctx.match[1];
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const { deletedTransaction, relationship } = await deleteTransactionService(
      txId,
      viewer.id,
    );

    await ctx.editMessageText(T.txDeleted, { parse_mode: "Markdown" });

    const contact =
      relationship.userAId === viewer.id
        ? relationship.userB
        : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const notifyMsg =
      deletedTransaction.type === "LOAN"
        ? contactT.notifyDeletedLoan(
            getDisplayName(viewer),
            sym,
            deletedTransaction.amount.toFixed(2),
          )
        : contactT.notifyDeletedDebt(
            getDisplayName(viewer),
            sym,
            deletedTransaction.amount.toFixed(2),
          );
    if (contact.telegramId) {
      ctx.telegram
        .sendMessage(contact.telegramId, notifyMsg, { parse_mode: "Markdown" })
        .catch(() => {});
    }
  } catch {
    await ctx.editMessageText(T.errSomethingWrong);
  }
});

bot.action("tx_delete_cancel", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Cancelled.");
});

// Settle single transaction
bot.action(/^tx_settle_confirm:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const txId = ctx.match[1];
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const { transaction, relationship } = await settleTransactionService(
      txId,
      viewer.id,
    );

    await ctx.editMessageText(T.txSettled, { parse_mode: "Markdown" });

    const contact =
      relationship.userAId === viewer.id
        ? relationship.userB
        : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const notifyMsg = contactT.notifySettledTransaction(
      getDisplayName(viewer),
      sym,
      transaction.amount.toFixed(2),
    );
    if (contact.telegramId) {
      ctx.telegram
        .sendMessage(contact.telegramId, notifyMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: contactT.btnSendFeedback,
                  callback_data: `tx_feedback:${viewer.telegramId ?? viewer.id}`,
                },
              ],
            ],
          },
        })
        .catch(() => {});
    }
  } catch {
    await ctx.editMessageText(T.errSomethingWrong);
  }
});

// Settle all transactions with contact
bot.action(/^settle_all_confirm:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const contactId = ctx.match[1];
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");
  const contactName = ctx.session.activeContactName ?? "?";

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await ctx.editMessageText(T.errSomethingWrong);
      return;
    }

    const { count, relationship: rel } = await settleAllService(
      relationship.id,
      viewer.id,
    );

    if (count === 0) {
      await ctx.editMessageText(T.txSettleAllEmpty(contactName), {
        parse_mode: "Markdown",
      });
      return;
    }

    await ctx.editMessageText(T.txSettleAllDone(count, contactName), {
      parse_mode: "Markdown",
    });

    const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
    const contactT = useT(contact.language);
    if (contact.telegramId) {
      ctx.telegram
        .sendMessage(
          contact.telegramId,
          contactT.notifySettledAll(getDisplayName(viewer)),
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: contactT.btnSendFeedback,
                    callback_data: `tx_feedback:${viewer.telegramId ?? viewer.id}`,
                  },
                ],
              ],
            },
          },
        )
        .catch(() => {});
    }
  } catch {
    await ctx.editMessageText(T.errSomethingWrong);
  }
});

bot.action("settle_cancel", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Cancelled.");
});

bot.action(/^recurring_cancel:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const recurringId = ctx.match![1];

  try {
    const recurring = await getRecurringTransactionById(recurringId);
    if (!recurring) {
      await ctx.editMessageText(T.recurringNotFound, {
        parse_mode: "Markdown",
      });
      return;
    }

    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (!viewer) {
      await ctx.reply(T.errUserNotFound);
      return;
    }

    const rel = recurring.relationship;
    const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
    const sym = currencySymbol(rel.currency, ctx.session.userLanguage);
    const typeLabel =
      recurring.type === "LOAN" ? T.txTypeLabelLoan : T.txTypeLabelDebt;

    await ctx.editMessageText(
      T.recurringCancelPrompt(
        typeLabel,
        sym,
        recurring.amount.toFixed(2),
        getDisplayName(contact),
      ),
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback(
              T.recurringCancelConfirmBtn,
              `recurring_cancel_confirm:${recurringId}`,
            ),
          ],
          [Markup.button.callback(T.btnCancel, "recurring_cancel_abort")],
        ]),
      },
    );
  } catch (err) {
    console.error("recurring_cancel error:", err);
    await ctx.reply(T.errSomethingWrong);
  }
});

bot.action(/^recurring_cancel_confirm:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  if (!ctx.from) return;
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const recurringId = ctx.match![1];

  try {
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (!viewer) {
      await ctx.reply(T.errUserNotFound);
      return;
    }
    await cancelRecurringTransaction(recurringId, viewer.id);
    await ctx.editMessageText(T.recurringCancelled, { parse_mode: "Markdown" });
  } catch (err) {
    console.error("recurring_cancel_confirm error:", err);
    await ctx.editMessageText(T.errSomethingWrong);
  }
});

bot.action("recurring_cancel_abort", async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.editMessageText("❌ Cancelled.");
});

// Catch-all for unhandled callbacks
bot.on("callback_query", async (ctx) => {
  await ctx.answerCbQuery("Unknown action.");
});

// Global bot error handler
bot.catch((err, ctx) => {
  Sentry.withScope((scope) => {
    scope.setTag("updateType", ctx.updateType);
    scope.setUser({ id: String(ctx.from?.id), username: ctx.from?.username });
    Sentry.captureException(err);
  });
  console.error(`Bot error for update ${ctx.update.update_id}:`, err);
});

export default bot;
