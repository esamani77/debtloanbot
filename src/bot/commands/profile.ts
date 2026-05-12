import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getUserBankAccounts } from '../../services/bankAccountService';
import { useT } from '../../i18n';

function langLabel(lang: Language): string {
  return lang === Language.FA ? '🇮🇷 Farsi' : '🇬🇧 English';
}

export async function profileHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user.');
    return;
  }

  const lang = ctx.session.userLanguage ?? Language.EN;
  const T = useT(lang);
  const telegramId = String(ctx.from.id);
  const fullName =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, fullName);
    const accounts = await getUserBankAccounts(user.id);

    const text =
      `${T.profileTitle}\n\n${T.profileInfo(user.name, langLabel(user.language))}`;

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.profileBtnBankAccounts(accounts.length), 'go_accounts')],
        [Markup.button.callback(T.btnChangeLang, 'change_lang')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('profile handler error:', error);
  }
}
