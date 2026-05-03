import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { useT } from '../../i18n';

export async function helpHandler(ctx: BotContext): Promise<void> {
  const T = useT(ctx.session.userLanguage ?? Language.EN);

  await ctx.reply(T.helpText, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback(T.btnInvite, 'get_invite_link'),
        Markup.button.callback(T.btnContacts, 'go_contacts'),
      ],
      [Markup.button.callback(T.btnAdd, 'add_transaction')],
      [Markup.button.callback(T.btnChangeLang, 'change_lang')],
    ]),
  });
}
