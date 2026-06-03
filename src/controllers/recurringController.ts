import { Request, Response } from 'express';
import { RecurringInterval, TransactionType } from '@prisma/client';
import { findUserById } from '../services/userService';
import { getRelationshipBetween } from '../services/relationshipService';
import {
  createRecurringTransaction,
  getActiveRecurringForUser,
  cancelRecurringTransaction,
  getRecurringTransactionById,
} from '../services/recurringTransactionService';

export async function listRecurring(_req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const items = await getActiveRecurringForUser(viewer.id);

    res.json(
      items.map((item) => {
        const rel = item.relationship;
        const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
        return {
          id: item.id,
          amount: item.amount,
          type: item.type,
          note: item.note,
          interval: item.interval,
          nextDueAt: item.nextDueAt,
          isActive: item.isActive,
          createdAt: item.createdAt,
          relationshipId: item.relationshipId,
          contact: { id: contact.id, name: contact.name },
        };
      }),
    );
  } catch (err) {
    console.error('listRecurring error:', err);
    res.status(500).json({ error: 'Failed to fetch recurring transactions.' });
  }
}

export async function createRecurring(req: Request, res: Response): Promise<void> {
  const { contactId, amount, type, note, interval } = req.body as {
    contactId?: string;
    amount?: number;
    type?: string;
    note?: string;
    interval?: string;
  };

  if (!contactId) { res.status(400).json({ error: 'contactId is required.' }); return; }
  if (typeof amount !== 'number' || amount <= 0) { res.status(400).json({ error: 'amount must be a positive number.' }); return; }
  if (type !== 'LOAN' && type !== 'DEBT') { res.status(400).json({ error: 'type must be LOAN or DEBT.' }); return; }
  if (!['WEEKLY', 'BIWEEKLY', 'MONTHLY'].includes(interval ?? '')) {
    res.status(400).json({ error: 'interval must be WEEKLY, BIWEEKLY, or MONTHLY.' }); return;
  }

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) { res.status(404).json({ error: 'No relationship found.' }); return; }

    const { recurring, firstTransaction } = await createRecurringTransaction({
      relationshipId: relationship.id,
      createdById: viewer.id,
      amount,
      type: type as TransactionType,
      note: note || undefined,
      interval: interval as RecurringInterval,
    });

    res.status(201).json({
      id: recurring.id,
      amount: recurring.amount,
      type: recurring.type,
      note: recurring.note,
      interval: recurring.interval,
      nextDueAt: recurring.nextDueAt,
      firstTransactionId: firstTransaction.id,
    });
  } catch (err) {
    console.error('createRecurring error:', err);
    res.status(500).json({ error: 'Failed to create recurring transaction.' });
  }
}

export async function deleteRecurring(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }

    const recurring = await getRecurringTransactionById(id);
    if (!recurring) { res.status(404).json({ error: 'Recurring transaction not found.' }); return; }

    await cancelRecurringTransaction(id, viewer.id);
    res.status(204).send();
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not authorized.') { res.status(403).json({ error: msg }); return; }
    if (msg === 'Recurring transaction not found.') { res.status(404).json({ error: msg }); return; }
    console.error('deleteRecurring error:', err);
    res.status(500).json({ error: 'Failed to cancel recurring transaction.' });
  }
}
