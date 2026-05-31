import cron from 'node-cron';
import { bot } from '../bot';
import prisma from '../db/prisma';
import { useT } from '../i18n';
import { calculateNetBalance } from '../utils/balanceCalc';
import { currencySymbol } from '../utils/currency';
import { getDisplayName } from '../services/userService';
import { User, Currency } from '@prisma/client';

interface BalanceEntry {
  contact: User;
  netBalance: number;
  currency: Currency;
}

async function sendDailyReminders(): Promise<void> {
  const relationships = await prisma.relationship.findMany({
    where: { transactions: { some: { isSettled: false } } },
    include: {
      userA: true,
      userB: true,
      transactions: {
        where: { isSettled: false },
        select: { amount: true, type: true, createdById: true },
      },
    },
  });

  const userBalances = new Map<string, { user: User; items: BalanceEntry[] }>();

  const addEntry = (user: User, contact: User, netBalance: number, currency: Currency) => {
    if (Math.abs(netBalance) < 0.01) return;
    const existing = userBalances.get(user.id);
    if (existing) {
      existing.items.push({ contact, netBalance, currency });
    } else {
      userBalances.set(user.id, { user, items: [{ contact, netBalance, currency }] });
    }
  };

  for (const rel of relationships) {
    const netA = calculateNetBalance(rel.transactions, rel.userAId);
    const netB = calculateNetBalance(rel.transactions, rel.userBId);
    addEntry(rel.userA, rel.userB, netA, rel.currency);
    addEntry(rel.userB, rel.userA, netB, rel.currency);
  }

  for (const { user, items } of userBalances.values()) {
    const t = useT(user.language);
    const owes = items
      .filter((i) => i.netBalance < 0)
      .map((i) => ({
        name: getDisplayName(i.contact),
        sym: currencySymbol(i.currency, user.language),
        amount: Math.abs(i.netBalance).toFixed(2),
      }));
    const owed = items
      .filter((i) => i.netBalance > 0)
      .map((i) => ({
        name: getDisplayName(i.contact),
        sym: currencySymbol(i.currency, user.language),
        amount: i.netBalance.toFixed(2),
      }));
    const msg = t.reminderMessage(owes, owed);
    bot.telegram.sendMessage(user.telegramId, msg, { parse_mode: 'Markdown' }).catch(() => {});
  }
}

export function startReminderJob(): void {
  const schedule = process.env.REMINDER_CRON ?? '0 * * * *';
  cron.schedule(schedule, () => {
    sendDailyReminders().catch((err) => console.error('Reminder job failed:', err));
  });
}
