import { Scenes, Markup } from 'telegraf';
import { Currency, Language, TransactionType } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, getDisplayName } from '../../services/userService';
import { updateTransaction } from '../../services/transactionService';
import { useT } from '../../i18n';
import { currencySymbol } from '../../utils/currency';

interface EditTransactionWizardState {
  txId: string;
  viewerId: string;
  currentAmount: number;
  currentNote: string | null;
  currentType: TransactionType;
  currency: string;
  newAmount?: number;
}

export const editTransactionScene = new Scenes.WizardScene<BotContext>(
  'EDIT_TRANSACTION',

  // Step 0: Ask for new amount
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as EditTransactionWizardState;
    const sym = currencySymbol(state.currency as Currency, ctx.session.userLanguage);

    await ctx.reply(T.txEditAmountPrompt(sym, state.currentAmount.toFixed(2)), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnSkipAmount, 'edit_skip_amount')],
        [Markup.button.callback(T.btnCancel, 'edit_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 1: Handle amount, ask for note
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as EditTransactionWizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'edit_cancel') {
        await ctx.editMessageText(T.txEditCancelled);
        return ctx.scene.leave();
      }
      if (data === 'edit_skip_amount') {
        state.newAmount = state.currentAmount;
        await ctx.editMessageText(T.txEditAmountPrompt(
          currencySymbol(state.currency as Currency, ctx.session.userLanguage),
          state.currentAmount.toFixed(2),
        ) + '\n\n_⏭ Skipped_', { parse_mode: 'Markdown' });
      }
    } else if (ctx.message && 'text' in ctx.message) {
      const parsed = parseFloat(ctx.message.text);
      if (isNaN(parsed) || parsed <= 0) {
        await ctx.reply(T.txInvalidAmount, {
          ...Markup.inlineKeyboard([[Markup.button.callback(T.btnCancel, 'edit_cancel')]]),
        });
        return;
      }
      state.newAmount = parsed;
    } else {
      return;
    }

    await ctx.reply(T.txEditNotePrompt(state.currentNote), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(T.btnSkipNote, 'edit_skip_note'),
          Markup.button.callback(T.btnClearNote, 'edit_clear_note'),
        ],
        [Markup.button.callback(T.btnCancel, 'edit_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 2: Handle note, save
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as EditTransactionWizardState;

    let newNote: string | null = state.currentNote;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      const data = ctx.callbackQuery.data;

      if (data === 'edit_cancel') {
        await ctx.editMessageText(T.txEditCancelled);
        return ctx.scene.leave();
      }
      if (data === 'edit_clear_note') {
        newNote = null;
      }
      // edit_skip_note → keep currentNote (already set above)
    } else if (ctx.message && 'text' in ctx.message) {
      newNote = ctx.message.text;
    } else {
      return;
    }

    if (!ctx.from) {
      await ctx.reply(T.errSomethingWrong);
      return ctx.scene.leave();
    }

    const telegramId = String(ctx.from.id);
    const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

    try {
      const viewer = await findOrCreateUser(telegramId, name);
      const { transaction, relationship } = await updateTransaction(
        state.txId,
        viewer.id,
        { amount: state.newAmount, note: newNote },
      );

      await ctx.reply(T.txEditSaved, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.btnLogs, 'view_logs')],
          [Markup.button.callback(T.btnContacts, 'go_contacts')],
        ]),
      });

      // Notify the other party in their language
      const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
      const contactT = useT(contact.language);
      const sym = currencySymbol(relationship.currency, contact.language);
      const notifyMsg = transaction.type === TransactionType.LOAN
        ? contactT.notifyEditedLoan(getDisplayName(viewer), sym, transaction.amount.toFixed(2))
        : contactT.notifyEditedDebt(getDisplayName(viewer), sym, transaction.amount.toFixed(2));
      const fullMsg = transaction.note
        ? `${notifyMsg}\n${contactT.notifyNote(transaction.note)}`
        : notifyMsg;
      if (contact.telegramId) {
        ctx.telegram.sendMessage(contact.telegramId, fullMsg, { parse_mode: 'Markdown' }).catch(() => {});
      }
    } catch {
      await ctx.reply(T.errSomethingWrong);
    }

    return ctx.scene.leave();
  },
);
