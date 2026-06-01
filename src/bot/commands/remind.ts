import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserByTelegramId, getDisplayName } from '../../services/userService';
import { useT } from '../../i18n';
import { calculateNetBalance } from '../../utils/balanceCalc';
import { currencySymbol } from '../../utils/currency';
import prisma from '../../db/prisma';

// In-memory rate limit: one nudge per sender+recipient pair per 24 hours.
// Resets on server restart — acceptable for single-process deployment.
const nudgeCooldowns = new Map<string, number>();
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function remindHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const viewer = await findOrCreateUser(telegramId, name, ctx.from.username);

    const relationships = await prisma.relationship.findMany({
      where: {
        transactions: { some: { isSettled: false } },
        OR: [{ userAId: viewer.id }, { userBId: viewer.id }],
      },
      include: {
        userA: true,
        userB: true,
        transactions: {
          where: { isSettled: false },
          select: { amount: true, type: true, createdById: true },
        },
      },
    });

    const debtors = relationships
      .map((rel) => {
        const net = calculateNetBalance(rel.transactions, viewer.id);
        const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
        return { contact, net, currency: rel.currency };
      })
      .filter((item) => item.net > 0.01);

    if (debtors.length === 0) {
      await ctx.reply(T.remindNoDebtors, { parse_mode: 'Markdown' });
      return;
    }

    const buttons = debtors.map((d) => {
      const sym = currencySymbol(d.currency, ctx.session.userLanguage);
      const label = `${getDisplayName(d.contact)} — ${sym}${d.net.toFixed(2)}`;
      return [Markup.button.callback(label, `remind_send:${d.contact.telegramId}`)];
    });

    await ctx.reply(T.remindPickContact, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  } catch (err) {
    console.error('remindHandler error:', err);
    await ctx.reply(T.errSomethingWrong);
  }
}

export async function handleRemindSend(ctx: BotContext, debtorTelegramId: string): Promise<void> {
  await ctx.answerCbQuery();
  if (!ctx.from) return;

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const viewerTelegramId = String(ctx.from.id);
  const viewerName = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  const cooldownKey = `${viewerTelegramId}:${debtorTelegramId}`;
  const lastSent = nudgeCooldowns.get(cooldownKey);
  if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
    const hoursLeft = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / (60 * 60 * 1000));
    await ctx.editMessageText(T.remindCooldown(hoursLeft), { parse_mode: 'Markdown' });
    return;
  }

  try {
    const viewer = await findOrCreateUser(viewerTelegramId, viewerName, ctx.from.username);
    const debtor = await findUserByTelegramId(debtorTelegramId);
    if (!debtor) {
      await ctx.editMessageText(T.errSomethingWrong);
      return;
    }

    const relationship = await prisma.relationship.findFirst({
      where: {
        OR: [
          { userAId: viewer.id, userBId: debtor.id },
          { userAId: debtor.id, userBId: viewer.id },
        ],
      },
      include: {
        transactions: {
          where: { isSettled: false },
          select: { amount: true, type: true, createdById: true },
        },
      },
    });

    if (!relationship) {
      await ctx.editMessageText(T.errSomethingWrong);
      return;
    }

    const net = calculateNetBalance(relationship.transactions, viewer.id);
    if (net <= 0.01) {
      await ctx.editMessageText(T.errSomethingWrong);
      return;
    }

    const debtorT = useT(debtor.language);
    const sym = currencySymbol(relationship.currency, debtor.language);
    const senderName = viewer.nickname ?? viewer.name;

    await ctx.telegram
      .sendMessage(debtorTelegramId, debtorT.remindReceived(senderName, sym, net.toFixed(2)), {
        parse_mode: 'Markdown',
      })
      .catch(() => {});

    nudgeCooldowns.set(cooldownKey, Date.now());

    await ctx.editMessageText(T.remindSent(getDisplayName(debtor)), { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('handleRemindSend error:', err);
    await ctx.editMessageText(T.errSomethingWrong);
  }
}
