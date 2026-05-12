import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { generateInviteLink } from '../../utils/inviteLink';
import { useT } from '../../i18n';

export async function inviteHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, name);
    const inviteLink = generateInviteLink(user.id);

    await ctx.reply(T.inviteText(inviteLink), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📤 Share Invite Link', `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}`)],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('invite handler error:', error);
  }
}
