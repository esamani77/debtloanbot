import { Scenes, Markup } from "telegraf";
import { Currency, Language, TransactionType } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findUserByTelegramId, findUserById } from "../../services/userService";
import { getRelationshipBetween } from "../../services/relationshipService";
import { addTransaction } from "../../services/transactionService";
import { currencySymbol } from "../../utils/currency";
import { useT } from "../../i18n";

interface WizardState {
  transactionType?: TransactionType;
  amount?: number;
  currency?: Currency;
}

export const addTransactionScene = new Scenes.WizardScene<BotContext>(
  "ADD_TRANSACTION",

  // Step 0: Ask for transaction type
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);

    if (!ctx.session.activeContactId) {
      await ctx.reply(
        T.txNoContact,
        Markup.inlineKeyboard([
          [Markup.button.callback(T.btnContacts, "go_contacts")],
        ]),
      );
      return ctx.scene.leave();
    }

    const contactName = ctx.session.activeContactName ?? "?";

    // Pre-load relationship currency into wizard state
    if (ctx.from) {
      const viewer = await findUserByTelegramId(String(ctx.from.id));
      if (viewer) {
        const rel = await getRelationshipBetween(
          viewer.id,
          ctx.session.activeContactId,
        );
        if (rel) (ctx.wizard.state as WizardState).currency = rel.currency;
      }
    }

    await ctx.reply(T.txTypeQuestion(contactName), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [
          { ...Markup.button.callback(T.txTypeBorrow, "tx_type:DEBT"), style: "danger" } as any,
          { ...Markup.button.callback(T.txTypeLend, "tx_type:LOAN"), style: "success" } as any,
        ],
        [Markup.button.callback(T.btnCancel, "tx_cancel")],
      ]),
    });

    return ctx.wizard.next();
  },

  // Step 1: Handle type selection, ask for amount
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);

    if (!ctx.callbackQuery || !("data" in ctx.callbackQuery)) {
      await ctx.reply(T.txUseButtons);
      return;
    }

    const data = ctx.callbackQuery.data;
    await ctx.answerCbQuery();

    if (data === "tx_cancel") {
      await ctx.editMessageText(T.txCancelled);
      return ctx.scene.leave();
    }

    if (data !== "tx_type:DEBT" && data !== "tx_type:LOAN") {
      await ctx.reply(T.txUseButtons);
      return;
    }

    const type =
      data === "tx_type:DEBT" ? TransactionType.DEBT : TransactionType.LOAN;
    (ctx.wizard.state as WizardState).transactionType = type;

    const typeLabel =
      type === TransactionType.DEBT ? T.txTypeBorrow : T.txTypeLend;
    const sym = currencySymbol(
      (ctx.wizard.state as WizardState).currency ?? Currency.USD,
    );

    await ctx.editMessageText(T.txSelectedType(typeLabel, sym), {
      parse_mode: "Markdown",
    });

    return ctx.wizard.next();
  },

  // Step 2: Validate amount, ask for note
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);

    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply(T.txEnterAmount);
      return;
    }

    const amount = parseFloat(ctx.message.text.trim());

    if (isNaN(amount) || amount <= 0) {
      await ctx.reply(
        T.txInvalidAmount,
        Markup.inlineKeyboard([
          [Markup.button.callback(T.btnCancel, "tx_cancel")],
        ]),
      );
      return;
    }

    (ctx.wizard.state as WizardState).amount = amount;

    const sym = currencySymbol(
      (ctx.wizard.state as WizardState).currency ?? Currency.USD,
    );
    await ctx.reply(T.txAmountConfirm(sym, amount.toFixed(2)), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnSkipNote, "tx_skip_note")],
        [Markup.button.callback(T.btnCancel, "tx_cancel")],
      ]),
    });

    return ctx.wizard.next();
  },

  // Step 3: Handle note, save transaction
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as WizardState;
    let note: string | undefined;

    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      const data = ctx.callbackQuery.data;
      await ctx.answerCbQuery();

      if (data === "tx_cancel") {
        await ctx.editMessageText(T.txCancelled);
        return ctx.scene.leave();
      }

      if (data === "tx_skip_note") {
        note = undefined;
        await ctx.editMessageText(T.txNoteSkipped);
      }
    } else if (ctx.message && "text" in ctx.message) {
      note = ctx.message.text.trim() || undefined;
    } else {
      await ctx.reply(
        T.txNoteOrSkip,
        Markup.inlineKeyboard([
          [Markup.button.callback(T.btnSkipNote, "tx_skip_note")],
        ]),
      );
      return;
    }

    if (!state.transactionType || state.amount === undefined) {
      await ctx.reply(T.txSomethingWrong);
      return ctx.scene.leave();
    }

    if (!ctx.from) {
      await ctx.reply(T.errCannotIdentify);
      return ctx.scene.leave();
    }

    try {
      const viewer = await findUserByTelegramId(String(ctx.from.id));
      if (!viewer) {
        await ctx.reply(T.errUserNotFound);
        return ctx.scene.leave();
      }

      const contactId = ctx.session.activeContactId!;
      const relationship = await getRelationshipBetween(viewer.id, contactId);

      if (!relationship) {
        await ctx.reply(T.errNoRelationship);
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
        state.transactionType === TransactionType.DEBT
          ? T.txTypeLabelDebt
          : T.txTypeLabelLoan;
      const contactName = ctx.session.activeContactName ?? "?";
      const sym = currencySymbol(state.currency ?? Currency.USD);

      // Notify the contact in their own language
      const contact = await findUserById(contactId);
      if (contact) {
        const contactT = useT(contact.language);
        const notifyMsg =
          state.transactionType === TransactionType.DEBT
            ? contactT.notifyBorrowed(
                viewer.name,
                sym,
                transaction.amount.toFixed(2),
              )
            : contactT.notifyLent(
                viewer.name,
                sym,
                transaction.amount.toFixed(2),
              );
        const fullMsg = note
          ? `${notifyMsg}\n${contactT.notifyNote(note)}`
          : notifyMsg;
        ctx.telegram
          .sendMessage(contact.telegramId, fullMsg, { parse_mode: "Markdown" })
          .catch(() => {});
      }

      await ctx.reply(
        T.txSaved(
          typeLabel,
          sym,
          transaction.amount.toFixed(2),
          contactName,
          note,
        ),
        {
          parse_mode: "Markdown",
          ...Markup.inlineKeyboard([
            [
              Markup.button.callback(T.btnBalance, "view_balance"),
              Markup.button.callback(T.btnLogs, "view_logs"),
            ],
            [Markup.button.callback(T.btnAddAnother, "add_transaction")],
          ]),
        },
      );
    } catch (error) {
      await ctx.reply(T.errSomethingWrong);
      console.error("addTransaction scene error:", error);
    }

    return ctx.scene.leave();
  },
);
