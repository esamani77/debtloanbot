import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { Currency, Language } from '@prisma/client';
import { BotContext, SessionData } from '../models/types';
import { addTransactionScene } from './scenes/addTransaction';
import { startHandler } from './commands/start';
import { inviteHandler } from './commands/invite';
import { contactsHandler } from './commands/contacts';
import { selectContactAction } from './commands/select';
import { balanceHandler } from './commands/balance';
import { logsHandler } from './commands/logs';
import { helpHandler } from './commands/help';
import { showCurrencyPicker, setCurrencyAction } from './commands/currency';
import { setLangAction } from './commands/language';
import { findUserByTelegramId } from '../services/userService';
import { useT } from '../i18n';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable is required.');
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
  })
);

// Language loader middleware — populates session.userLanguage for returning users
bot.use(async (ctx, next) => {
  if (ctx.from && !ctx.session.userLanguage) {
    const user = await findUserByTelegramId(String(ctx.from.id));
    if (user) ctx.session.userLanguage = user.language;
  }
  return next();
});

// Stage (scene) middleware
const stage = new Scenes.Stage<BotContext>([addTransactionScene]);
bot.use(stage.middleware());

// Command handlers
bot.start(startHandler);
bot.command('invite', inviteHandler);
bot.command('contacts', contactsHandler);
bot.command('balance', balanceHandler);
bot.command('add', (ctx) => ctx.scene.enter('ADD_TRANSACTION'));
bot.command('logs', logsHandler);
bot.command('help', helpHandler);

// Language selection
bot.action(/^set_lang:(.+)$/, async (ctx) => {
  await setLangAction(ctx, ctx.match[1] as Language);
});

bot.action('change_lang', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply(
    '🌐 Choose your language:\n\nزبان خود را انتخاب کنید:',
    Markup.inlineKeyboard([
      [
        Markup.button.callback('🇬🇧 English', 'set_lang:EN'),
        Markup.button.callback('🇮🇷 فارسی', 'set_lang:FA'),
      ],
    ])
  );
});

// Contact selection
bot.action(/^select_contact:(.+)$/, selectContactAction);

// Currency
bot.action('set_currency', async (ctx) => {
  await ctx.answerCbQuery();
  await showCurrencyPicker(ctx);
});

bot.action(/^set_currency:(.+)$/, async (ctx) => {
  await setCurrencyAction(ctx, ctx.match[1] as Currency);
});

// Back to contact detail menu
bot.action('go_back_contact', async (ctx) => {
  await ctx.answerCbQuery();
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const contactName = ctx.session.activeContactName ?? '?';
  await ctx.editMessageText(T.selectActiveContact(contactName), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(T.btnBalance, 'view_balance'),
        Markup.button.callback(T.btnLogs, 'view_logs'),
      ],
      [Markup.button.callback(T.btnAdd, 'add_transaction')],
      [Markup.button.callback(T.btnSetCurrency, 'set_currency')],
      [Markup.button.callback(T.btnBackContacts, 'go_contacts')],
    ]),
  });
});

// Navigation
bot.action('go_contacts', async (ctx) => {
  await ctx.answerCbQuery();
  await contactsHandler(ctx);
});

bot.action('get_invite_link', async (ctx) => {
  await ctx.answerCbQuery();
  await inviteHandler(ctx);
});

bot.action('show_help', async (ctx) => {
  await ctx.answerCbQuery();
  await helpHandler(ctx);
});

bot.action('view_balance', async (ctx) => {
  await ctx.answerCbQuery();
  await balanceHandler(ctx);
});

bot.action('view_logs', async (ctx) => {
  await ctx.answerCbQuery();
  await logsHandler(ctx);
});

bot.action('add_transaction', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('ADD_TRANSACTION');
});

// Catch-all for unhandled callbacks
bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery('Unknown action.');
});

export default bot;
