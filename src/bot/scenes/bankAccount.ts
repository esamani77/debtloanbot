import { Scenes, Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findUserByTelegramId } from '../../services/userService';
import {
  addBankAccount,
  updateBankAccount,
  getBankAccountById,
} from '../../services/bankAccountService';
import { useT } from '../../i18n';

interface BankAccountWizardState {
  mode?: 'add' | 'edit';
  editId?: string;
  prefillName?: string;
  prefillCardNumber?: string;
  prefillAccountNumber?: string;
  prefillBankName?: string;
  name?: string;
  cardNumber?: string;
  accountNumber?: string;
}

function formatCardHint(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/(.{4})/g, '$1-').replace(/-$/, '');
}

export const bankAccountScene = new Scenes.WizardScene<BotContext>(
  'BANK_ACCOUNT',

  // Step 0: Ask for account holder name
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as BankAccountWizardState;

    const hint = state.prefillName ? ` (current: ${state.prefillName})` : '';
    await ctx.reply(`${T.acctEnterName}${hint}`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnCancel, 'acct_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 1: Handle name, ask for card number
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as BankAccountWizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'acct_cancel') {
        await ctx.editMessageText(T.acctCancelled);
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(T.acctEnterName);
      return;
    }

    state.name = ctx.message.text.trim() || state.prefillName;

    const hint = state.prefillCardNumber
      ? ` (current: ${formatCardHint(state.prefillCardNumber)})`
      : '';
    await ctx.reply(`${T.acctEnterCardNumber}${hint}`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnCancel, 'acct_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 2: Handle card number, ask for account number
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as BankAccountWizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'acct_cancel') {
        await ctx.editMessageText(T.acctCancelled);
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(T.acctEnterCardNumber);
      return;
    }

    const raw = ctx.message.text.trim();
    const digits = raw.replace(/\D/g, '');

    if (digits.length !== 16) {
      await ctx.reply(T.acctInvalidCardNumber, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.btnCancel, 'acct_cancel')],
        ]),
      });
      return;
    }

    state.cardNumber = digits;

    const hint = state.prefillAccountNumber
      ? ` (current: ${state.prefillAccountNumber})`
      : '';
    await ctx.reply(`${T.acctEnterAccountNumber}${hint}`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnCancel, 'acct_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 3: Handle account number, ask for bank name
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as BankAccountWizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'acct_cancel') {
        await ctx.editMessageText(T.acctCancelled);
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(T.acctEnterAccountNumber);
      return;
    }

    state.accountNumber = ctx.message.text.trim() || state.prefillAccountNumber;

    const hint = state.prefillBankName ? ` (current: ${state.prefillBankName})` : '';
    await ctx.reply(`${T.acctEnterBankName}${hint}`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnCancel, 'acct_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 4: Handle bank name, save
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as BankAccountWizardState;

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === 'acct_cancel') {
        await ctx.editMessageText(T.acctCancelled);
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply(T.acctEnterBankName);
      return;
    }

    const bankName = ctx.message.text.trim() || state.prefillBankName;

    if (!ctx.from) {
      await ctx.reply(T.errCannotIdentify);
      return ctx.scene.leave();
    }

    const user = await findUserByTelegramId(String(ctx.from.id));
    if (!user) {
      await ctx.reply(T.errUserNotFound);
      return ctx.scene.leave();
    }

    const data = {
      name: state.name ?? state.prefillName ?? '',
      cardNumber: state.cardNumber ?? state.prefillCardNumber ?? '',
      accountNumber: state.accountNumber ?? state.prefillAccountNumber ?? '',
      bankName: bankName ?? '',
    };

    try {
      if (state.mode === 'edit' && state.editId) {
        await updateBankAccount(state.editId, user.id, data);
        await ctx.reply(T.acctUpdated, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.btnAccounts, 'go_accounts')],
          ]),
        });
      } else {
        await addBankAccount(user.id, data);
        await ctx.reply(T.acctSaved, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.btnAccounts, 'go_accounts')],
          ]),
        });
      }
    } catch {
      await ctx.reply(T.errSomethingWrong);
    }

    return ctx.scene.leave();
  },
);
