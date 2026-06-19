import { Request, Response } from 'express';
import { TransactionType } from '@prisma/client';
import { findUserById, getDisplayName } from '../services/userService';
import { getRelationshipBetween } from '../services/relationshipService';
import {
  addTransaction,
  updateTransaction as updateTransactionService,
  deleteTransaction as deleteTransactionService,
  settleTransaction as settleTransactionService,
} from '../services/transactionService';
import { createAndNotify, NotificationType } from '../services/notificationService';
import { useT } from '../i18n';
import { currencySymbol } from '../utils/currency';

export async function createTransaction(req: Request, res: Response): Promise<void> {
  const { contactId, amount, type, note } = req.body as {
    contactId?: string;
    amount?: number;
    type?: string;
    note?: string;
  };

  if (!contactId || typeof contactId !== 'string') {
    res.status(400).json({ error: 'contactId is required.' });
    return;
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number.' });
    return;
  }
  if (type !== 'LOAN' && type !== 'DEBT') {
    res.status(400).json({ error: 'type must be LOAN or DEBT.' });
    return;
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const transaction = await addTransaction({
      relationshipId: relationship.id,
      createdById: viewer.id,
      amount,
      type: type as TransactionType,
      note: note || undefined,
    });

    res.status(201).json({
      id: transaction.id,
      amount: transaction.amount,
      type: transaction.type,
      note: transaction.note,
      currency: relationship.currency,
      createdAt: transaction.createdAt,
    });

    const contact = await findUserById(contactId);
    if (!contact) return;

    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const tgMsg = type === 'DEBT'
      ? contactT.notifyBorrowed(getDisplayName(viewer), sym, transaction.amount.toFixed(2))
      : contactT.notifyLent(getDisplayName(viewer), sym, transaction.amount.toFixed(2));
    const tgFull = note ? `${tgMsg}\n${contactT.notifyNote(note)}` : tgMsg;

    const title = type === 'DEBT'
      ? contactT.notifyPushTitleBorrowed(getDisplayName(viewer))
      : contactT.notifyPushTitleLent(getDisplayName(viewer));
    const body = contactT.notifyPushBodyAmount(sym, transaction.amount.toFixed(2), note);

    createAndNotify(
      contact.id,
      NotificationType.TRANSACTION_ADDED,
      title,
      body,
      { transactionId: transaction.id, contactId: viewer.id },
      tgFull,
      { reply_markup: { inline_keyboard: [[{ text: contactT.btnSendFeedback, callback_data: `tx_feedback:${viewer.telegramId ?? viewer.id}` }]] } },
    ).catch(() => {});
  } catch {
    res.status(500).json({ error: 'Failed to create transaction.' });
  }
}

export async function updateTransaction(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { amount, note } = req.body as { amount?: number; note?: string | null };

  if (amount !== undefined && (typeof amount !== 'number' || amount <= 0)) {
    res.status(400).json({ error: 'amount must be a positive number.' });
    return;
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const { transaction, relationship } = await updateTransactionService(id, viewer.id, { amount, note });

    res.json({ id: transaction.id, amount: transaction.amount, note: transaction.note });

    const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const effectiveType = transaction.createdById === viewer.id
      ? transaction.type
      : (transaction.type === 'LOAN' ? 'DEBT' : 'LOAN');
    const tgMsg = effectiveType === 'LOAN'
      ? contactT.notifyEditedLoan(getDisplayName(viewer), sym, transaction.amount.toFixed(2))
      : contactT.notifyEditedDebt(getDisplayName(viewer), sym, transaction.amount.toFixed(2));
    const tgFull = transaction.note ? `${tgMsg}\n${contactT.notifyNote(transaction.note)}` : tgMsg;

    const title = contactT.notifyPushTitleEdited(getDisplayName(viewer));
    const body = contactT.notifyPushBodyAmount(sym, transaction.amount.toFixed(2), transaction.note ?? undefined);

    createAndNotify(
      contact.id,
      NotificationType.TRANSACTION_EDITED,
      title,
      body,
      { transactionId: transaction.id, contactId: viewer.id },
      tgFull,
    ).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not authorized.') { res.status(403).json({ error: msg }); return; }
    if (msg === 'Transaction not found.') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Transaction is already settled.') { res.status(422).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to update transaction.' });
  }
}

export async function settleTransaction(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const { transaction, relationship, alreadySettled } = await settleTransactionService(id, viewer.id);

    res.json({ id: transaction.id, isSettled: transaction.isSettled });

    if (alreadySettled) return;

    const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const tgMsg = contactT.notifySettledTransaction(getDisplayName(viewer), sym, transaction.amount.toFixed(2));

    const title = contactT.notifyPushTitleSettled(getDisplayName(viewer));
    const body = contactT.notifyPushBodySettled(sym, transaction.amount.toFixed(2));

    createAndNotify(
      contact.id,
      NotificationType.TRANSACTION_SETTLED,
      title,
      body,
      { transactionId: transaction.id, contactId: viewer.id },
      tgMsg,
      { reply_markup: { inline_keyboard: [[{ text: contactT.btnSendFeedback, callback_data: `tx_feedback:${viewer.telegramId ?? viewer.id}` }]] } },
    ).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not authorized.') { res.status(403).json({ error: msg }); return; }
    if (msg === 'Transaction not found.') { res.status(404).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to settle transaction.' });
  }
}

export async function deleteTransaction(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const { deletedTransaction, relationship } = await deleteTransactionService(id, viewer.id);

    res.status(204).send();

    const contact = relationship.userAId === viewer.id ? relationship.userB : relationship.userA;
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const effectiveType = deletedTransaction.createdById === viewer.id
      ? deletedTransaction.type
      : (deletedTransaction.type === 'LOAN' ? 'DEBT' : 'LOAN');
    const tgMsg = effectiveType === 'LOAN'
      ? contactT.notifyDeletedLoan(getDisplayName(viewer), sym, deletedTransaction.amount.toFixed(2))
      : contactT.notifyDeletedDebt(getDisplayName(viewer), sym, deletedTransaction.amount.toFixed(2));

    const title = contactT.notifyPushTitleDeleted(getDisplayName(viewer));
    const body = contactT.notifyPushBodyDeleted(sym, deletedTransaction.amount.toFixed(2));

    createAndNotify(
      contact.id,
      NotificationType.TRANSACTION_DELETED,
      title,
      body,
      { contactId: viewer.id },
      tgMsg,
    ).catch(() => {});
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not authorized.') { res.status(403).json({ error: msg }); return; }
    if (msg === 'Transaction not found.') { res.status(404).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to delete transaction.' });
  }
}
