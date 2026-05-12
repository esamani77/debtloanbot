import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findUserById, findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { useT } from '../../i18n';

export async function selectContactAction(ctx: BotContext): Promise<void> {
  if (!ctx.from || !ctx.match) {
    await ctx.answerCbQuery('Something went wrong. Please try again.');
    return;
  }

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const contactId = ctx.match[1];
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    await ctx.answerCbQuery();

    const viewer = await findOrCreateUser(telegramId, name);
    const contact = await findUserById(contactId);

    if (!contact) {
      await ctx.editMessageText('⚠️ Contact not found.');
      return;
    }

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await ctx.editMessageText(T.errNoRelationship);
      return;
    }

    ctx.session.activeContactId = contactId;
    ctx.session.activeContactName = contact.name;

    await ctx.editMessageText(T.selectActiveContact(contact.name), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(T.btnBalance, 'view_balance'),
          Markup.button.callback(T.btnLogs, 'view_logs'),
        ],
        [Markup.button.callback(T.btnAdd, 'add_transaction')],
        [Markup.button.callback(T.btnWithdrawalInfo, `view_withdrawal:${contactId}`)],
        [Markup.button.callback(T.btnSetCurrency, 'set_currency')],
        [Markup.button.callback(T.btnBackContacts, 'go_contacts')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('select contact action error:', error);
  }
}
