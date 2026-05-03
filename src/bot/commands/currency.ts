import { Markup } from 'telegraf';
import { Currency, Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween, updateRelationshipCurrency } from '../../services/relationshipService';
import { ALL_CURRENCIES, currencyLabel, currencySymbol } from '../../utils/currency';
import { useT } from '../../i18n';

export async function showCurrencyPicker(ctx: BotContext): Promise<void> {
  const T = useT(ctx.session.userLanguage ?? Language.EN);

  if (!ctx.session.activeContactId) {
    await ctx.reply(
      T.errNoContact,
      Markup.inlineKeyboard([[Markup.button.callback(T.btnContacts, 'go_contacts')]])
    );
    return;
  }

  const contactName = ctx.session.activeContactName ?? '?';
  const buttons = ALL_CURRENCIES.map((c) => [
    Markup.button.callback(currencyLabel(c), `set_currency:${c}`),
  ]);
  buttons.push([Markup.button.callback(T.btnBack, 'go_back_contact')]);

  await ctx.reply(
    `${T.currencyPickerTitle(contactName)}\n\n${T.currencyPickerDesc}`,
    { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
  );
}

export async function setCurrencyAction(ctx: BotContext, currency: Currency): Promise<void> {
  if (!ctx.from || !ctx.session.activeContactId) {
    await ctx.answerCbQuery('Something went wrong.');
    return;
  }

  await ctx.answerCbQuery();

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const relationship = await getRelationshipBetween(viewer.id, ctx.session.activeContactId);

    if (!relationship) {
      await ctx.editMessageText(T.errNoRelationship);
      return;
    }

    await updateRelationshipCurrency(relationship.id, currency);

    const contactName = ctx.session.activeContactName ?? '?';
    const label = currencyLabel(currency);
    const sym = currencySymbol(currency);

    await ctx.editMessageText(T.currencyUpdated(label, contactName, sym), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(T.btnBalance, 'view_balance'),
          Markup.button.callback(T.btnAdd, 'add_transaction'),
        ],
        [Markup.button.callback(T.btnContacts, 'go_contacts')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('setCurrency action error:', error);
  }
}
