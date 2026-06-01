import { Request, Response } from 'express';
import { findOrCreateUser, getDisplayName } from '../services/userService';
import { getUserRelationships, getRelationshipBetween } from '../services/relationshipService';
import { getBalance, getRecentTransactions, settleAllTransactions as settleAllService } from '../services/transactionService';
import { bot } from '../bot';
import { useT } from '../i18n';

export async function listContacts(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName, res.locals.telegramUsername);
    const relationships = await getUserRelationships(viewer.id);

    res.json(
      relationships.map(({ contact, relationship, netBalance }) => ({
        contact: { id: contact.id, name: getDisplayName(contact), telegramId: contact.telegramId },
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

export async function settleAllTransactions(req: Request, res: Response): Promise<void> {
  const contactId = req.params.id as string;

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);

    const relationship = await getRelationshipBetween(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const { count, relationship: rel } = await settleAllService(relationship.id, viewer.id);

    res.json({ settledCount: count });

    if (count > 0) {
      const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
      const contactT = useT(contact.language);
      const notifyMsg = contactT.notifySettledAll(getDisplayName(viewer));
      bot.telegram.sendMessage(contact.telegramId, notifyMsg, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: contactT.btnSendFeedback, callback_data: `tx_feedback:${viewer.telegramId}` }]],
        },
      }).catch(() => {});
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Not authorized.") { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to settle transactions.' });
  }
}
