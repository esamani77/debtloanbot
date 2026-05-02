import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';
import { findUserById, findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';

/**
 * Handles selection of an active contact via callback query.
 * Triggered by action(/^select_contact:(.+)$/) pattern.
 */
export async function selectContactAction(ctx: BotContext): Promise<void> {
  if (!ctx.from || !ctx.match) {
    await ctx.answerCbQuery('Something went wrong. Please try again.');
    return;
  }

  const contactId = ctx.match[1];
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    await ctx.answerCbQuery();

    const viewer = await findOrCreateUser(telegramId, name);
    const contact = await findUserById(contactId);

    if (!contact) {
      await ctx.editMessageText('⚠️ Contact not found. They may have been removed.');
      return;
    }

    // Verify relationship exists
    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await ctx.editMessageText(
        '⚠️ No connection found with this user. Use /invite to connect.'
      );
      return;
    }

    ctx.session.activeContactId = contactId;
    ctx.session.activeContactName = contact.name;

    await ctx.editMessageText(
      `✅ *Active Contact: ${contact.name}*\n\nWhat would you like to do?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💰 View Balance', 'view_balance'),
            Markup.button.callback('📋 View Logs', 'view_logs'),
          ],
          [Markup.button.callback('➕ Add Transaction', 'add_transaction')],
          [Markup.button.callback('💱 Set Currency', 'set_currency')],
          [Markup.button.callback('👥 Back to Contacts', 'go_contacts')],
        ]),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('select contact action error:', error);
  }
}
