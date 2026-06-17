import cron from "node-cron";
import { useT } from "../i18n";
import { currencySymbol } from "../utils/currency";
import { getDisplayName } from "../services/userService";
import { getDueRecurringTransactions, materializeRecurring } from "../services/recurringTransactionService";
import { createAndNotify, NotificationType } from "../services/notificationService";
import { Sentry } from "../sentry";

const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 Weeks",
  MONTHLY: "Monthly",
};

async function processRecurringTransactions(): Promise<void> {
  console.log("[recurringJob] Starting run...");

  const dueItems = await getDueRecurringTransactions();
  console.log(`[recurringJob] Found ${dueItems.length} due recurring transactions`);

  for (const item of dueItems) {
    try {
      const transaction = await materializeRecurring(item);

      const rel = item.relationship;
      const creator = rel.userAId === item.createdById ? rel.userA : rel.userB;
      const contact = rel.userAId === item.createdById ? rel.userB : rel.userA;

      const intervalLabel = INTERVAL_LABELS[item.interval] ?? item.interval;
      const creatorSym = currencySymbol(rel.currency, creator.language);
      const contactSym = currencySymbol(rel.currency, contact.language);

      const creatorT = useT(creator.language);
      const contactT = useT(contact.language);

      // Notify creator
      createAndNotify(
        creator.id,
        NotificationType.RECURRING_TRANSACTION,
        `Recurring transaction fired`,
        `${intervalLabel} · ${creatorSym} ${transaction.amount.toFixed(2)} with ${getDisplayName(contact)}`,
        { transactionId: transaction.id, contactId: contact.id },
        creatorT.recurringMaterialized(intervalLabel, creatorSym, transaction.amount.toFixed(2), getDisplayName(contact)),
      ).catch(() => {});

      // Notify contact
      const tgMsg = item.type === "DEBT"
        ? contactT.notifyBorrowed(getDisplayName(creator), contactSym, transaction.amount.toFixed(2))
        : contactT.notifyLent(getDisplayName(creator), contactSym, transaction.amount.toFixed(2));
      const noteMsgPart = item.note ? `\n${contactT.notifyNote(item.note)}` : "";
      const recurringPart = `\n${contactT.recurringLabel(intervalLabel)}`;

      createAndNotify(
        contact.id,
        NotificationType.RECURRING_TRANSACTION,
        `Recurring transaction from ${getDisplayName(creator)}`,
        `${intervalLabel} · ${contactSym} ${transaction.amount.toFixed(2)}${item.note ? ` — ${item.note}` : ""}`,
        { transactionId: transaction.id, contactId: creator.id },
        `${tgMsg}${noteMsgPart}${recurringPart}`,
      ).catch(() => {});

      console.log(`[recurringJob] Materialized ${item.id}`);
      Sentry.logger.info("Recurring transaction materialized", { id: item.id });
    } catch (err) {
      console.error(`[recurringJob] Failed to materialize ${item.id}:`, err);
      Sentry.captureException(err);
    }
  }

  console.log("[recurringJob] Done.");
}

export function startRecurringJob(): void {
  const schedule = process.env.RECURRING_CRON ?? "0 8 * * *";
  console.log(`[recurringJob] Scheduled (cron: ${schedule})`);

  cron.schedule(schedule, async () => {
    try {
      await processRecurringTransactions();
    } catch (err) {
      Sentry.captureException(err);
      console.error("[recurringJob] Top-level failure:", err);
    }
  });
}
