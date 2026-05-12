import { Telegraf, Scenes, session, Markup } from "telegraf";
import { Currency, Language } from "@prisma/client";
import { BotContext, SessionData } from "../models/types";
import { addTransactionScene } from "./scenes/addTransaction";
import { bankAccountScene } from "./scenes/bankAccount";
import { nicknameSetupScene } from "./scenes/nicknameSetup";
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
import {
  bankAccountsHandler,
  handleDeleteConfirm,
  handleDeleteExecute,
  withdrawalInfoHandler,
} from "./commands/bankAccounts";
import { getBankAccountById } from "../services/bankAccountService";
import { findUserByTelegramId } from "../services/userService";
import { useT } from "../i18n";
import { en } from "../i18n/en";
import { fa } from "../i18n/fa";
import { Sentry } from "../sentry";

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
    }),
  }),
);

// Language loader middleware — populates session.userLanguage for returning users
bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.session.userLanguage) {
    const user = await findUserByTelegramId(String(ctx.from.id));
    if (user) ctx.session.userLanguage = user.language;
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
]);
bot.use(stage.middleware());

// Command handlers
bot.start(startHandler);
bot.command("invite", inviteHandler);
bot.command("contacts", contactsHandler);
bot.command("balance", balanceHandler);
bot.command("add", (ctx) => ctx.scene.enter("ADD_TRANSACTION"));
bot.command("logs", logsHandler);
bot.command("help", helpHandler);
bot.command("accounts", bankAccountsHandler);
bot.command("profile", profileHandler);

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
  const name = ctx.from?.first_name ?? '';
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
