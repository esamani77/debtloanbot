import { Request, Response } from 'express';
import { findOrCreateUser, getDisplayName } from '../services/userService';
import { getUserRelationships, getRelationshipBetween } from '../services/relationshipService';
import { getBalance, getRecentTransactions } from '../services/transactionService';

export async function listContacts(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const relationships = await getUserRelationships(viewer.id);

    res.json(
      relationships.map(({ contact, relationship, netBalance }) => ({
        contact: { id: contact.id, name: getDisplayName(contact) },
        relationship: { id: relationship.id, currency: relationship.currency },
        netBalance,
      }))
    );
  } catch {
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
}

export async function getContactBalance(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const contactId = req.params.id as string;

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const { amount, direction, contactName } = await getBalance(relationship.id, viewer.id);
    res.json({ amount, direction, contactName, currency: relationship.currency });
  } catch {
    res.status(500).json({ error: 'Failed to fetch balance.' });
  }
}

export async function getContactLogs(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const contactId = req.params.id as string;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const transactions = await getRecentTransactions(relationship.id, viewer.id, limit);
    res.json({ currency: relationship.currency, transactions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch logs.' });
  }
}
