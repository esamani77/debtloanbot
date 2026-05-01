import { Scenes, Markup } from 'telegraf';
import { TransactionType } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findUserByTelegramId } from '../../services/userService';
import { getRelationshipBetween } from '../../services/relationshipService';
import { addTransaction } from '../../services/transactionService';

interface WizardState {
  transactionType?: TransactionType;
  amount?: number;
}

export const addTransactionScene = new Scenes.WizardScene<BotContext>(
  'ADD_TRANSACTION',

  // Step 0: Ask for transaction type
  async (ctx) => {
    if (!ctx.session.activeContactId) {
      await ctx.reply(
        '⚠️ No contact selected. Please use /contacts to select a contact first.',
        Markup.inlineKeyboard([[Markup.button.callback('📋 View Contacts', 'go_contacts')]])
      );
      return ctx.scene.leave();
    }

    const contactName = ctx.session.activeContactName ?? 'your contact';

    await ctx.reply(
      `Adding a transaction with *${contactName}*.\n\nWhat type of transaction is this?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [
            Markup.button.callback('💸 I Borrowed (Debt)', 'tx_type:DEBT'),
            Markup.button.callback('💰 I Lent (Loan)', 'tx_type:LOAN'),
          ],
          [Markup.button.callback('❌ Cancel', 'tx_cancel')],
        ]),
      }
    );

    return ctx.wizard.next();
  },

  // Step 1: Handle type selection, ask for amount
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
      await ctx.reply('Please use the buttons above to select a transaction type.');
      return;
    }

    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === 'tx_cancel') {
      await ctx.editMessageText('Transaction cancelled.');
      return ctx.scene.leave();
    }

    if (data !== 'tx_type:DEBT' && data !== 'tx_type:LOAN') {
      await ctx.reply('Please use the buttons above to select a transaction type.');
      return;
    }

    const type = data === 'tx_type:DEBT' ? TransactionType.DEBT : TransactionType.LOAN;
    (ctx.wizard.state as WizardState).transactionType = type;

    const typeLabel = type === TransactionType.DEBT ? '💸 I Borrowed (Debt)' : '💰 I Lent (Loan)';
    await ctx.editMessageText(`Selected: *${typeLabel}*\n\nEnter the amount (e.g. 25.50):`, {
      parse_mode: 'Markdown',
    });

    return ctx.wizard.next();
  },

  // Step 2: Validate amount, ask for note
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid amount as a number (e.g. 25.50):');
      return;
    }

    const amountText = ctx.message.text.trim();
    const amount = parseFloat(amountText);

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        '⚠️ Invalid amount. Please enter a positive number (e.g. 25.50):',
        Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'tx_cancel')]])
      );
      return;
    }

    (ctx.wizard.state as WizardState).amount = amount;

    await ctx.reply(
      `Amount: *$${amount.toFixed(2)}*\n\nWould you like to add a note for this transaction?`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⏭ Skip Note', 'tx_skip_note')],
          [Markup.button.callback('❌ Cancel', 'tx_cancel')],
        ]),
      }
    );

    return ctx.wizard.next();
  },

  // Step 3: Handle note or skip, save transaction
  async (ctx) => {
    const state = ctx.wizard.state as WizardState;
    let note: string | undefined;

    // Handle callback (Skip or Cancel)
    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      await ctx.answerCbQuery();

      if (data === 'tx_cancel') {
        await ctx.editMessageText('Transaction cancelled.');
        return ctx.scene.leave();
      }

      if (data === 'tx_skip_note') {
        note = undefined;
        await ctx.editMessageText('No note added.');
      }
    } else if (ctx.message && 'text' in ctx.message) {
      // Handle text note
      note = ctx.message.text.trim() || undefined;
    } else {
      await ctx.reply(
        'Please type a note or press "Skip Note":',
        Markup.inlineKeyboard([[Markup.button.callback('⏭ Skip Note', 'tx_skip_note')]])
      );
      return;
    }

    if (!state.transactionType || state.amount === undefined) {
      await ctx.reply('Something went wrong. Please start over with /add.');
      return ctx.scene.leave();
    }

    if (!ctx.from) {
      await ctx.reply('Could not identify user. Please try again.');
      return ctx.scene.leave();
    }

    const telegramId = String(ctx.from.id);

    try {
      const viewer = await findUserByTelegramId(telegramId);
      if (!viewer) {
        await ctx.reply('User not found. Please send /start first.');
        return ctx.scene.leave();
      }

      const contactId = ctx.session.activeContactId!;
      const relationship = await getRelationshipBetween(viewer.id, contactId);

      if (!relationship) {
        await ctx.reply(
          '⚠️ No relationship found with this contact. Please invite them first using /invite.'
        );
        return ctx.scene.leave();
      }

      const transaction = await addTransaction({
        relationshipId: relationship.id,
        createdById: viewer.id,
        amount: state.amount,
        type: state.transactionType,
        note,
      });

      const typeLabel =
        state.transactionType === TransactionType.DEBT ? '💸 Debt (I Borrowed)' : '💰 Loan (I Lent)';
      const contactName = ctx.session.activeContactName ?? 'contact';

      await ctx.reply(
        `✅ *Transaction Saved!*\n\n` +
          `Type: ${typeLabel}\n` +
          `Amount: *$${transaction.amount.toFixed(2)}*\n` +
          `With: ${contactName}` +
          (note ? `\nNote: ${note}` : ''),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback('💰 View Balance', 'view_balance'),
              Markup.button.callback('📋 View Logs', 'view_logs'),
            ],
            [Markup.button.callback('➕ Add Another', 'add_transaction')],
          ]),
        }
      );
    } catch (error) {
      await ctx.reply('Something went wrong while saving the transaction. Please try again.');
      console.error('addTransaction scene error:', error);
    }

    return ctx.scene.leave();
  }
);
