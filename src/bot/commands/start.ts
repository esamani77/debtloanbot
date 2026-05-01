import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserById } from '../../services/userService';
import { getOrCreateRelationship } from '../../services/relationshipService';
import { parseInvitePayload } from '../../utils/inviteLink';

export async function startHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name +
    (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, name);

    // Check for invite payload
    const payload = (ctx as BotContext & { startPayload?: string }).startPayload;
    if (payload) {
      const inviterId = parseInvitePayload(payload);

      if (inviterId && inviterId !== user.id) {
        const inviter = await findUserById(inviterId);

        if (!inviter) {
          await ctx.reply(
            `Welcome to *DebtMate*, ${name}! 👋\n\n` +
              `The invite link appears to be invalid, but your account has been created.\n` +
              `Use /invite to connect with your friends!`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('📨 Invite a Friend', 'get_invite_link')],
                [Markup.button.callback('❓ Help', 'show_help')],
              ]),
            }
          );
          return;
        }

        const { created } = await getOrCreateRelationship(user.id, inviter.id);

        if (created) {
          // Notify the new user
          await ctx.reply(
            `Welcome to *DebtMate*, ${name}! 👋\n\n` +
              `You've been connected with *${inviter.name}*!\n` +
              `You can now track debts and loans between you.`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Contacts', 'go_contacts')],
                [Markup.button.callback('➕ Add Transaction', 'add_transaction')],
                [Markup.button.callback('❓ Help', 'show_help')],
              ]),
            }
          );

          // Notify the inviter via their chat (if bot can reach them)
          try {
            await ctx.telegram.sendMessage(
              inviter.telegramId,
              `🎉 *${name}* has accepted your invite and is now connected with you on DebtMate!\n\nUse /contacts to view your connections.`,
              {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                  [Markup.button.callback('📋 View Contacts', 'go_contacts')],
                ]),
              }
            );
          } catch {
            // Silently ignore if we can't reach the inviter
          }
        } else {
          await ctx.reply(
            `Welcome back to *DebtMate*, ${name}! 👋\n\n` +
              `You're already connected with *${inviter.name}*.`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('📋 View Contacts', 'go_contacts')],
                [Markup.button.callback('❓ Help', 'show_help')],
              ]),
            }
          );
        }

        return;
      }
    }

    // Standard welcome
    await ctx.reply(
      `Welcome to *DebtMate*, ${name}! 💰\n\n` +
        `Track debts and loans with your friends easily.\n\n` +
        `*Available Commands:*\n` +
        `/invite — Get your invite link\n` +
        `/contacts — View your contacts & balances\n` +
        `/balance — Check balance with active contact\n` +
        `/add — Add a transaction\n` +
        `/logs — View recent transactions\n` +
        `/help — Show this help message`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📨 Invite a Friend', 'get_invite_link')],
          [Markup.button.callback('📋 View Contacts', 'go_contacts')],
          [Markup.button.callback('❓ Help', 'show_help')],
        ]),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('start handler error:', error);
  }
}
