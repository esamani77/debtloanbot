import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getExpenseStats } from '../../services/expenseService';
import { useT } from '../../i18n';

const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', IRT: 'T', TRY: '₺',
};

function sym(currency: string) {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export async function expensesHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, name);
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const stats = await getExpenseStats(user.id, month, year);

    const miniAppUrl = `https://t.me/${BOT_USERNAME}/app`;

    if (stats.grandTotal === 0) {
      await ctx.reply(
        `${T.expensesTitle}\n\n${T.expensesEmpty}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.url('📱 Open Expenses', miniAppUrl)],
          ]),
        },
      );
      return;
    }

    // Build summary text
    const monthName = now.toLocaleString('en-US', { month: 'long' });

    // Determine display currency from most common in expenses (fallback USD)
    const displaySym = '$';

    let text = `${T.expensesTitle}\n\n`;
    text += `📅 *${monthName} ${year}*\n`;
    text += `${T.expensesMonthlyTotal(displaySym, stats.grandTotal.toFixed(2))}\n`;

    if (stats.totalByCategory.length > 0) {
      text += `\n*By category:*\n`;
      const sorted = [...stats.totalByCategory].sort((a, b) => b.amount - a.amount);
      for (const item of sorted.slice(0, 6)) {
        const pct = Math.round((item.amount / stats.grandTotal) * 100);
        text += `${item.category.icon} ${item.category.name}: *${displaySym}${item.amount.toFixed(2)}* _(${pct}%)_\n`;
      }
      if (sorted.length > 6) {
        text += `_…and ${sorted.length - 6} more categories_\n`;
      }
    }

    await ctx.reply(text, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('📱 View Full Tracker', miniAppUrl)],
      ]),
    });
  } catch (error) {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    await ctx.reply(T.errSomethingWrong);
    console.error('expenses handler error:', error);
  }
}
