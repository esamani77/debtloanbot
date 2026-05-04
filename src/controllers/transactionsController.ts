import { Request, Response } from 'express';
import { TransactionType } from '@prisma/client';
import { findOrCreateUser, findUserById } from '../services/userService';
import { getRelationshipBetween } from '../services/relationshipService';
import { addTransaction } from '../services/transactionService';
import { bot } from '../bot';
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
  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).json({ error: 'amount must be a positive number.' });
    return;
  }
  if (type !== 'LOAN' && type !== 'DEBT') {
    res.status(400).json({ error: 'type must be LOAN or DEBT.' });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);

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

    // Notify the contact in their own language
    const contact = await findUserById(contactId);
    if (contact) {
      const sym = currencySymbol(relationship.currency);
      const contactT = useT(contact.language);
      const notifyMsg =
        type === 'DEBT'
          ? contactT.notifyBorrowed(viewer.name, sym, transaction.amount.toFixed(2))
          : contactT.notifyLent(viewer.name, sym, transaction.amount.toFixed(2));
      const fullMsg = note ? `${notifyMsg}\n${contactT.notifyNote(note)}` : notifyMsg;
      bot.telegram
        .sendMessage(contact.telegramId, fullMsg, { parse_mode: 'Markdown' })
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
    res.status(500).json({ error: 'Failed to create transaction.' });
  }
}
