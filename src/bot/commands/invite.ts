import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { generateInviteLink } from '../../utils/inviteLink';

export async function inviteHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, name);
    const inviteLink = generateInviteLink(user.id);

    await ctx.reply(
      `📨 *Your Personal Invite Link*\n\n` +
        `Share this link with a friend to connect with them on DebtMate:\n\n` +
        `\`${inviteLink}\`\n\n` +
        `When they tap the link and start the bot, you'll be connected automatically!`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.url('🔗 Open Invite Link', inviteLink)],
          [Markup.button.callback('📋 View Contacts', 'go_contacts')],
        ]),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('invite handler error:', error);
  }
}
