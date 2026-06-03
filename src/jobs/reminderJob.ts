import cron from "node-cron";
import { bot } from "../bot";
import prisma from "../db/prisma";
import { useT } from "../i18n";
import { calculateNetBalance } from "../utils/balanceCalc";
import { currencySymbol } from "../utils/currency";
import { getDisplayName } from "../services/userService";
import { Sentry } from "../sentry";
import { User, Currency } from "@prisma/client";

interface BalanceEntry {
  contact: User;
  netBalance: number;
  currency: Currency;
}

async function sendDailyReminders(): Promise<void> {
  console.log("[reminderJob] Starting daily reminder run...");

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

  console.log(
    `[reminderJob] Found ${relationships.length} relationships with unsettled transactions`,
  );

  Sentry.logger.info(
    `[reminderJob] Found ${relationships.length} relationships with unsettled transactions`,
  );

  const userBalances = new Map<string, { user: User; items: BalanceEntry[] }>();

  const addEntry = (
    user: User,
    contact: User,
    netBalance: number,
    currency: Currency,
  ) => {
    if (Math.abs(netBalance) < 0.01) return;
    const existing = userBalances.get(user.id);
    if (existing) {
      existing.items.push({ contact, netBalance, currency });
    } else {
      userBalances.set(user.id, {
        user,
        items: [{ contact, netBalance, currency }],
      });
    }
  };

  for (const rel of relationships) {
    const netA = calculateNetBalance(rel.transactions, rel.userAId);
    const netB = calculateNetBalance(rel.transactions, rel.userBId);
    addEntry(rel.userA, rel.userB, netA, rel.currency);
    addEntry(rel.userB, rel.userA, netB, rel.currency);
  }

  console.log(`[reminderJob] Sending reminders to ${userBalances.size} users`);

  Sentry.logger.info(
    `[reminderJob] Sending reminders to ${userBalances.size} users`,
  );
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
    console.log(
      `[reminderJob] Sending to user ${user.telegramId} (owes: ${owes.length}, owed: ${owed.length})`,
    );
    Sentry.logger.info("Reminder job sending", {
      action: "sending",
      user: user.telegramId,
      userName: user.name,
      userLanguage: user.language,
      owes: owes.length,
      owed: owed.length,
    });
    if (!user.telegramId) continue;
    await bot.telegram
      .sendMessage(user.telegramId, msg, { parse_mode: "Markdown" })
      .then(() => console.log(`[reminderJob] Sent to ${user.telegramId}`))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        console.error(
          `[reminderJob] Failed to send to ${user.telegramId}:`,
          message,
        );
      });
  }

  console.log("[reminderJob] Done.");
}

export function startReminderJob(): void {
  const schedule = "*/5 * * * *";
  Sentry.logger.info("Reminder job started before cron", { action: "before" });

  cron.schedule(schedule, async () => {
    try {
      Sentry.logger.info("Reminder job started in cron", { action: "after" });
      await sendDailyReminders();
    } catch (err) {
      Sentry.logger.warn("Reminder job failed", { action: "cron" });

      Sentry.captureException(err);
      console.error("Reminder job failed:", err);
    }
  });
}
