import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserById } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { getBalance } from '../../services/transactionService';
import { currencySymbol } from '../../utils/currency';
import { useT } from '../../i18n';
import { replyOrEdit } from '../utils';

export async function balanceHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const T = useT(ctx.session.userLanguage ?? Language.EN);

  if (!ctx.session.activeContactId) {
    await replyOrEdit(
      ctx,
      T.errNoContact,
      Markup.inlineKeyboard([[Markup.button.callback(T.btnContacts, 'go_contacts')]]),
    );
    return;
  }

  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const contactId = ctx.session.activeContactId;

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await replyOrEdit(
        ctx,
        T.errNoRelationship,
        Markup.inlineKeyboard([[Markup.button.callback(T.btnContacts, 'go_contacts')]]),
      );
      return;
    }

    const { amount, direction, contactName } = await getBalance(relationship.id, viewer.id);
    const sym = currencySymbol(relationship.currency, ctx.session.userLanguage);

    let message: string;
    if (direction === 'settled') message = T.balanceSettled(contactName);
    else if (direction === 'owed') message = T.balanceOwed(contactName, sym, amount.toFixed(2));
    else message = T.balanceOwes(contactName, sym, amount.toFixed(2));

    const contact = direction === 'owed' ? await findUserById(contactId) : null;

    const keyboard = direction === 'owed' && contact
      ? Markup.inlineKeyboard([
          [
            Markup.button.callback(T.btnLogs, 'view_logs'),
            Markup.button.callback(T.btnAdd, 'add_transaction'),
          ],
          [Markup.button.callback(T.btnSettlementRequest, `settlement_req:${contact.telegramId}`)],
          [Markup.button.callback(T.btnContacts, 'go_contacts')],
        ])
      : Markup.inlineKeyboard([
          [
            Markup.button.callback(T.btnLogs, 'view_logs'),
            Markup.button.callback(T.btnAdd, 'add_transaction'),
          ],
          [Markup.button.callback(T.btnContacts, 'go_contacts')],
        ]);

    await replyOrEdit(ctx, message, {
      parse_mode: 'Markdown',
      ...keyboard,
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('balance handler error:', error);
  }
}
