import { Markup } from 'telegraf';
import { Currency } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween, updateRelationshipCurrency } from '../../services/relationshipService';
import { ALL_CURRENCIES, currencyLabel, currencySymbol } from '../../utils/currency';

export async function showCurrencyPicker(ctx: BotContext): Promise<void> {
  if (!ctx.session.activeContactId) {
    await ctx.reply(
      '⚠️ No contact selected.',
      Markup.inlineKeyboard([[Markup.button.callback('📋 View Contacts', 'go_contacts')]])
    );
    return;
  }

  const contactName = ctx.session.activeContactName ?? 'your contact';
  const buttons = ALL_CURRENCIES.map((c) => [
    Markup.button.callback(currencyLabel(c), `set_currency:${c}`),
  ]);
  buttons.push([Markup.button.callback('↩️ Back', 'go_back_contact')]);

  await ctx.reply(
    `💱 Select currency for transactions with *${contactName}*:\n\nAll existing and future transactions with this contact will display in the selected currency.`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

export async function setCurrencyAction(ctx: BotContext, currency: Currency): Promise<void> {
  if (!ctx.from || !ctx.session.activeContactId) {
    await ctx.answerCbQuery('Something went wrong.');
    return;
  }

  await ctx.answerCbQuery();

  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const relationship = await getRelationshipBetween(viewer.id, ctx.session.activeContactId);

    if (!relationship) {
      await ctx.editMessageText('⚠️ No connection found with this contact.');
      return;
    }

    await updateRelationshipCurrency(relationship.id, currency);

    const contactName = ctx.session.activeContactName ?? 'contact';

    await ctx.editMessageText(
      `✅ Currency updated to *${currencyLabel(currency)}*\n\nAll transactions with *${contactName}* will now show in ${currencySymbol(currency)}.`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 View Balance', 'view_balance'),
            Markup.button.callback('➕ Add Transaction', 'add_transaction'),
          ],
          [Markup.button.callback('👥 Back to Contacts', 'go_contacts')],
        ]),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('setCurrency action error:', error);
  }
}
