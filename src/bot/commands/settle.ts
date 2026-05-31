import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { useT } from '../../i18n';
import { replyOrEdit } from '../utils';

export async function settleAllHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user.');
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

  const contactName = ctx.session.activeContactName ?? '?';

  await replyOrEdit(ctx, T.txSettleAllConfirm(contactName), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback(T.txSettleConfirmBtn, `settle_all_confirm:${ctx.session.activeContactId}`)],
      [Markup.button.callback(T.btnCancel, 'settle_cancel')],
    ]),
  });
}
