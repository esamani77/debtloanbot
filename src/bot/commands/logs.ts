import { Markup } from 'telegraf';
import { Language, TransactionType } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { getRecentTransactions } from '../../services/transactionService';
import { TransactionSummary } from '../../models/types';
import { currencySymbol } from '../../utils/currency';
import { useT } from '../../i18n';
import { Translations } from '../../i18n/types';
import { replyOrEdit } from '../utils';

function formatTransaction(tx: TransactionSummary, symbol: string, T: Translations): string {
  const date = tx.createdAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const typeIcon = tx.type === TransactionType.LOAN ? '💰' : '💸';
  const typeLabel = tx.type === TransactionType.LOAN ? T.logLoan : T.logDebt;
  const addedBy = tx.addedByViewer ? T.logAddedByYou : tx.addedByName;
  const noteText = tx.note ? `\n   📝 ${tx.note}` : '';

  const bot = process.env.BOT_USERNAME ?? '';
  const editLink = `[✏️ Edit](https://t.me/${bot}?start=edit_${tx.id})`;
  const delLink = `[🗑️ Delete](https://t.me/${bot}?start=del_${tx.id})`;
  const actions = `\n   ${editLink}   ${delLink}`;

  return `${typeIcon} *${typeLabel}* — ${symbol}${tx.amount.toFixed(2)}\n   📅 ${date} · ${addedBy}${noteText}${actions}`;
}

export async function logsHandler(ctx: BotContext): Promise<void> {
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
    const contactName = ctx.session.activeContactName ?? 'Contact';

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      await replyOrEdit(
        ctx,
        T.errNoRelationship,
        Markup.inlineKeyboard([[Markup.button.callback(T.btnContacts, 'go_contacts')]]),
      );
      return;
    }

    const transactions = await getRecentTransactions(relationship.id, viewer.id, 10);
    const symbol = currencySymbol(relationship.currency, ctx.session.userLanguage);

    if (transactions.length === 0) {
      await replyOrEdit(ctx, T.logsEmpty(contactName), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.btnAdd, 'add_transaction')],
          [Markup.button.callback(T.btnContacts, 'go_contacts')],
        ]),
      });
      return;
    }

    const logLines = transactions.map((tx) => formatTransaction(tx, symbol, T)).join('\n\n');

    await replyOrEdit(ctx, `${T.logsTitle(contactName)}\n\n${logLines}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(T.btnAdd, 'add_transaction'),
          Markup.button.callback(T.btnBalance, 'view_balance'),
        ],
        [Markup.button.callback(T.btnContacts, 'go_contacts')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('logs handler error:', error);
  }
}
