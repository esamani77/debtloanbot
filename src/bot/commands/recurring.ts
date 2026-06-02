import { Markup } from "telegraf";
import { Language } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findUserByTelegramId, getDisplayName } from "../../services/userService";
import { getActiveRecurringForUser } from "../../services/recurringTransactionService";
import { currencySymbol } from "../../utils/currency";
import { useT } from "../../i18n";

const INTERVAL_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Every 2 Weeks",
  MONTHLY: "Monthly",
};

const INTERVAL_LABELS_FA: Record<string, string> = {
  WEEKLY: "هفتگی",
  BIWEEKLY: "هر ۲ هفته",
  MONTHLY: "ماهانه",
};

export async function recurringHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const isFarsi = ctx.session.userLanguage === Language.FA;

  try {
    const viewer = await findUserByTelegramId(String(ctx.from.id));
    if (!viewer) {
      await ctx.reply(T.errUserNotFound);
      return;
    }

    const items = await getActiveRecurringForUser(viewer.id);

    if (items.length === 0) {
      await ctx.reply(`${T.recurringListTitle}\n\n${T.recurringListEmpty}`, {
        parse_mode: "Markdown",
      });
      return;
    }

    const labelMap = isFarsi ? INTERVAL_LABELS_FA : INTERVAL_LABELS;

    const lines = items.map((item, i) => {
      const rel = item.relationship;
      const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
      const sym = currencySymbol(rel.currency, ctx.session.userLanguage);
      const typeLabel =
        item.type === "LOAN" ? T.txTypeLabelLoan : T.txTypeLabelDebt;
      const intervalLabel = labelMap[item.interval] ?? item.interval;
      const nextDueAt = item.nextDueAt.toLocaleDateString("en-GB");
      return T.recurringListItem(
        i + 1,
        typeLabel,
        sym,
        item.amount.toFixed(2),
        getDisplayName(contact),
        intervalLabel,
        nextDueAt,
      );
    });

    const keyboard = items.map((item, i) => [
      Markup.button.callback(
        `❌ Cancel #${i + 1}`,
        `recurring_cancel:${item.id}`,
      ),
    ]);

    await ctx.reply(`${T.recurringListTitle}\n\n${lines.join("\n\n")}`, {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard(keyboard),
    });
  } catch (err) {
    console.error("recurringHandler error:", err);
    await ctx.reply(useT(ctx.session.userLanguage ?? Language.EN).errSomethingWrong);
  }
}
