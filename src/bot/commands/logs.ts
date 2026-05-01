import { Markup } from 'telegraf';
import { TransactionType } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { getRecentTransactions } from '../../services/transactionService';
import { TransactionSummary } from '../../models/types';

function formatTransaction(tx: TransactionSummary): string {
  const date = tx.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const typeIcon = tx.type === TransactionType.LOAN ? '💰' : '💸';
  const typeLabel = tx.type === TransactionType.LOAN ? 'Loan' : 'Debt';
  const addedBy = tx.addedByViewer ? 'You' : tx.addedByName;
  const noteText = tx.note ? `\n   📝 ${tx.note}` : '';

  return `${typeIcon} *${typeLabel}* — $${tx.amount.toFixed(2)}\n   📅 ${date} · Added by ${addedBy}${noteText}`;
}

export async function logsHandler(ctx: BotContext): Promise<void> {
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
    const contactName = ctx.session.activeContactName ?? 'Contact';

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await ctx.reply(
        '⚠️ No relationship found with this contact.',
        Markup.inlineKeyboard([[Markup.button.callback('📋 View Contacts', 'go_contacts')]])
      );
      return;
    }

    const transactions = await getRecentTransactions(relationship.id, viewer.id, 10);

    if (transactions.length === 0) {
      await ctx.reply(
        `📋 *Transaction Logs with ${contactName}*\n\nNo transactions yet. Add one to get started!`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('➕ Add Transaction', 'add_transaction')],
            [Markup.button.callback('👥 View Contacts', 'go_contacts')],
          ]),
        }
      );
      return;
    }

    const logLines = transactions.map(formatTransaction).join('\n\n');

    await ctx.reply(
      `📋 *Recent Transactions with ${contactName}*\n\n${logLines}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('➕ Add Transaction', 'add_transaction'),
            Markup.button.callback('💰 View Balance', 'view_balance'),
          ],
          [Markup.button.callback('👥 View Contacts', 'go_contacts')],
        ]),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('logs handler error:', error);
  }
}
