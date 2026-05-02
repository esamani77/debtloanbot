import { Telegraf, Scenes, session, Markup } from 'telegraf';
import { Currency } from '@prisma/client';
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

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN environment variable is required.');
}

export const bot = new Telegraf<BotContext>(BOT_TOKEN);

// Session middleware — must be registered BEFORE stage middleware
bot.use(
  session({
    defaultSession: (): SessionData => ({
      __scenes: { cursor: 0 },
      activeContactId: undefined,
      activeContactName: undefined,
    }),
  })
);

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

// Contact selection via callback
bot.action(/^select_contact:(.+)$/, selectContactAction);

// Currency picker and setter
bot.action('set_currency', async (ctx) => {
  await ctx.answerCbQuery();
  await showCurrencyPicker(ctx);
});

bot.action(/^set_currency:(.+)$/, async (ctx) => {
  await setCurrencyAction(ctx, ctx.match[1] as Currency);
});

bot.action('go_back_contact', async (ctx) => {
  await ctx.answerCbQuery();
  const contactName = ctx.session.activeContactName ?? 'Contact';
  await ctx.editMessageText(
    `✅ *Active Contact: ${contactName}*\n\nWhat would you like to do?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('💰 View Balance', 'view_balance'),
          Markup.button.callback('📋 View Logs', 'view_logs'),
        ],
        [Markup.button.callback('➕ Add Transaction', 'add_transaction')],
        [Markup.button.callback('💱 Set Currency', 'set_currency')],
        [Markup.button.callback('👥 Back to Contacts', 'go_contacts')],
      ]),
    }
  );
});

// Navigation callbacks
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

// Catch-all for unhandled callback queries
bot.on('callback_query', async (ctx) => {
  await ctx.answerCbQuery('Unknown action.');
});

export default bot;
