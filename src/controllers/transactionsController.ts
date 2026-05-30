import { Request, Response } from "express";
import { TransactionType } from "@prisma/client";
import {
  findOrCreateUser,
  findUserById,
  getDisplayName,
} from "../services/userService";
import { getRelationshipBetween } from "../services/relationshipService";
import { addTransaction, updateTransaction as updateTransactionService, deleteTransaction as deleteTransactionService } from "../services/transactionService";
import { bot } from "../bot";
import { useT } from "../i18n";
import { currencySymbol } from "../utils/currency";

export async function createTransaction(
  req: Request,
  res: Response,
): Promise<void> {
  const { contactId, amount, type, note } = req.body as {
    contactId?: string;
    amount?: number;
    type?: string;
    note?: string;
  };

  if (!contactId || typeof contactId !== "string") {
    res.status(400).json({ error: "contactId is required." });
    return;
  }
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ error: "amount must be a positive number." });
    return;
  }
  if (type !== "LOAN" && type !== "DEBT") {
    res.status(400).json({ error: "type must be LOAN or DEBT." });
    return;
  }

  try {
    const viewer = await findOrCreateUser(
      res.locals.telegramId,
      res.locals.telegramName,
    );

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      res
        .status(404)
        .json({ error: "No relationship found with this contact." });
      return;
    }

    const transaction = await addTransaction({
      relationshipId: relationship.id,
      createdById: viewer.id,
      amount,
      type: type as TransactionType,
      note: note || undefined,
    });

    // Notify the contact in their own language
    const contact = await findUserById(contactId);
    if (contact) {
      const contactT = useT(contact.language);
      const sym = currencySymbol(relationship.currency, contact.language);
      const notifyMsg =
        type === "DEBT"
          ? contactT.notifyBorrowed(
              getDisplayName(viewer),
              sym,
              transaction.amount.toFixed(2),
            )
          : contactT.notifyLent(
              getDisplayName(viewer),
              sym,
              transaction.amount.toFixed(2),
            );
      const fullMsg = note
        ? `${notifyMsg}\n${contactT.notifyNote(note)}`
        : notifyMsg;
      bot.telegram
        .sendMessage(contact.telegramId, fullMsg, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: contactT.btnSendFeedback, callback_data: `tx_feedback:${viewer.telegramId}` }],
            ],
          },
        })
        .catch(() => {});
    }

    res.status(201).json({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      note: transaction.note,
      currency: relationship.currency,
      createdAt: transaction.createdAt,
    });
  } catch {
    res.status(500).json({ error: "Failed to create transaction." });
  }
}

export async function updateTransaction(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { amount, note } = req.body as { amount?: number; note?: string | null };

  if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
    res.status(400).json({ error: "amount must be a positive number." });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const { transaction, relationship } = await updateTransactionService(id, viewer.id, { amount, note });

    res.json({ id: transaction.id, amount: transaction.amount, note: transaction.note });

    // Notify the other party in their language
    const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const notifyMsg = transaction.type === "LOAN"
      ? contactT.notifyEditedLoan(getDisplayName(viewer), sym, transaction.amount.toFixed(2))
      : contactT.notifyEditedDebt(getDisplayName(viewer), sym, transaction.amount.toFixed(2));
    const fullMsg = transaction.note
      ? `${notifyMsg}\n${contactT.notifyNote(transaction.note)}`
      : notifyMsg;
    bot.telegram.sendMessage(contact.telegramId, fullMsg, { parse_mode: "Markdown" }).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Not authorized.") { res.status(403).json({ error: msg }); return; }
    if (msg === "Transaction not found.") { res.status(404).json({ error: msg }); return; }
    res.status(500).json({ error: "Failed to update transaction." });
  }
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const { deletedTransaction, relationship } = await deleteTransactionService(id, viewer.id);

    res.status(204).send();

    // Notify the other party in their language
    const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const notifyMsg = deletedTransaction.type === "LOAN"
      ? contactT.notifyDeletedLoan(getDisplayName(viewer), sym, deletedTransaction.amount.toFixed(2))
      : contactT.notifyDeletedDebt(getDisplayName(viewer), sym, deletedTransaction.amount.toFixed(2));
    bot.telegram.sendMessage(contact.telegramId, notifyMsg, { parse_mode: "Markdown" }).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Not authorized.") { res.status(403).json({ error: msg }); return; }
    if (msg === "Transaction not found.") { res.status(404).json({ error: msg }); return; }
    res.status(500).json({ error: "Failed to delete transaction." });
  }
}
