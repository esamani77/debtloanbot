import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserByTelegramId } from '../../services/userService';
import {
  getUserBankAccounts,
  deleteBankAccount,
  getBankAccountById,
} from '../../services/bankAccountService';
import { useT } from '../../i18n';

function maskCard(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (d.length !== 16) return raw;
  return `${d.slice(0, 4)}-****-****-${d.slice(12)}`;
}

export async function bankAccountsHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user.');
    return;
  }

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const fullName =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, fullName);
    const accounts = await getUserBankAccounts(user.id);

    if (accounts.length === 0) {
      await ctx.reply(`${T.acctTitle}\n\n${T.acctEmpty}`, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.btnAddAccount, 'acct_add')],
        ]),
      });
      return;
    }

    const list = accounts
      .map((a, i) => T.acctItem(i + 1, a.bankName, a.name, maskCard(a.cardNumber)))
      .join('\n\n');

    const editDeleteRows = accounts.map((a) => [
      Markup.button.callback(`✏️ ${a.bankName}`, `acct_edit:${a.id}`),
      Markup.button.callback(`🗑️`, `acct_delete:${a.id}`),
    ]);

    await ctx.reply(`${T.acctTitle}\n\n${list}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        ...editDeleteRows,
        [Markup.button.callback(T.btnAddAccount, 'acct_add')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('bankAccounts handler error:', error);
  }
}

export async function handleDeleteConfirm(ctx: BotContext, accountId: string): Promise<void> {
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  await ctx.answerCbQuery();

  const account = await getBankAccountById(accountId);
  if (!account) {
    await ctx.editMessageText(T.errSomethingWrong);
    return;
  }

  await ctx.editMessageText(T.acctConfirmDelete(account.bankName, account.name), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [
        Markup.button.callback('✅ Yes', `acct_delete_confirm:${accountId}`),
        Markup.button.callback('❌ No', 'go_accounts'),
      ],
    ]),
  });
}

export async function handleDeleteExecute(ctx: BotContext, accountId: string): Promise<void> {
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  await ctx.answerCbQuery();

  if (!ctx.from) {
    await ctx.editMessageText(T.errCannotIdentify);
    return;
  }

  const user = await findUserByTelegramId(String(ctx.from.id));
  if (!user) {
    await ctx.editMessageText(T.errUserNotFound);
    return;
  }

  const deleted = await deleteBankAccount(accountId, user.id);
  if (!deleted) {
    await ctx.editMessageText(T.errSomethingWrong);
    return;
  }

  await ctx.editMessageText(T.acctDeleted, {
    ...Markup.inlineKeyboard([
      [Markup.button.callback(T.btnAccounts, 'go_accounts')],
    ]),
  });
}

export async function withdrawalInfoHandler(ctx: BotContext, contactId: string): Promise<void> {
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  await ctx.answerCbQuery();

  const contactName = ctx.session.activeContactName ?? '?';

  try {
    const accounts = await getUserBankAccounts(contactId);

    if (accounts.length === 0) {
      await ctx.editMessageText(
        `${T.withdrawalTitle(contactName)}\n\n${T.withdrawalEmpty(contactName)}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback(T.btnBack, 'go_back_contact')],
          ]),
        },
      );
      return;
    }

    const list = accounts
      .map((a) => T.withdrawalItem(a.bankName, a.name, a.cardNumber, a.accountNumber))
      .join('\n\n');

    await ctx.editMessageText(`${T.withdrawalTitle(contactName)}\n\n${list}`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnBack, 'go_back_contact')],
      ]),
    });
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error('withdrawalInfo handler error:', error);
  }
}
