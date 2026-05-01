import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { getBalance } from '../../services/transactionService';

function formatBalanceMessage(
  amount: number,
  direction: 'owed' | 'owes' | 'settled',
  contactName: string
): string {
  if (direction === 'settled') {
    return `✅ *All Settled!*\n\nYou and *${contactName}* are all settled up. No outstanding balance.`;
  }

  if (direction === 'owed') {
    return (
      `💚 *You are owed money!*\n\n` +
      `*${contactName}* owes you *$${amount.toFixed(2)}*`
    );
  }

  return (
    `❤️ *You owe money*\n\n` +
    `You owe *${contactName}* *$${amount.toFixed(2)}*`
  );
}

export async function balanceHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  if (!ctx.session.activeContactId) {
    await ctx.reply(
      '⚠️ No contact selected. Please select a contact first.',
      Markup.inlineKeyboard([[Markup.button.callback('📋 View Contacts', 'go_contacts')]])
    );
    return;
  }

  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const viewer = await findOrCreateUser(telegramId, name);
    const contactId = ctx.session.activeContactId;

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await ctx.reply(
        '⚠️ No relationship found with this contact.',
        Markup.inlineKeyboard([[Markup.button.callback('📋 View Contacts', 'go_contacts')]])
      );
      return;
    }

    const { amount, direction, contactName } = await getBalance(relationship.id, viewer.id);
    const message = formatBalanceMessage(amount, direction, contactName);

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📋 View Logs', 'view_logs'),
          Markup.button.callback('➕ Add Transaction', 'add_transaction'),
        ],
        [Markup.button.callback('👥 View Contacts', 'go_contacts')],
      ]),
    });
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('balance handler error:', error);
  }
}
