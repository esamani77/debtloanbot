import { Request, Response } from 'express';
import { findUserById, getDisplayName } from '../services/userService';
import { getUserRelationships, getRelationshipBetween } from '../services/relationshipService';
import { getBalance, getRecentTransactions, settleAllTransactions as settleAllService } from '../services/transactionService';
import { getUserBankAccounts } from '../services/bankAccountService';
import { bot } from '../bot';
import { useT } from '../i18n';
import { currencySymbol } from '../utils/currency';
import prisma from '../db/prisma';

export async function listContacts(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
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

async function resolveRelationship(viewerId: string, idParam: string) {
  const byPair = await getRelationshipBetween(viewerId, idParam);
  if (byPair) return byPair;
  const byId = await prisma.relationship.findUnique({ where: { id: idParam } });
  if (byId && (byId.userAId === viewerId || byId.userBId === viewerId)) return byId;
  return null;
}

export async function getContactBalance(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const contactId = req.params.id as string;

    const relationship = await resolveRelationship(viewer.id, contactId);
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
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const contactId = req.params.id as string;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const relationship = await resolveRelationship(viewer.id, contactId);
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
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }

    const relationship = await resolveRelationship(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const { count, relationship: rel } = await settleAllService(relationship.id, viewer.id);

    res.json({ settledCount: count });

    if (count > 0) {
      const contact = rel.userAId === viewer.id ? rel.userB : rel.userA;
      if (contact.telegramId) {
        const contactT = useT(contact.language);
        const notifyMsg = contactT.notifySettledAll(getDisplayName(viewer));
        bot.telegram.sendMessage(contact.telegramId, notifyMsg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: contactT.btnSendFeedback, callback_data: `tx_feedback:${viewer.telegramId ?? viewer.id}` }]],
          },
        }).catch(() => {});
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Not authorized.') { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to settle transactions.' });
  }
}

export async function requestSettlement(req: Request, res: Response): Promise<void> {
  const contactId = req.params.id as string;

  try {
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }

    const accounts = await getUserBankAccounts(viewer.id);
    if (accounts.length === 0) {
      res.status(422).json({ error: 'no_bank_account' });
      return;
    }

    const relationship = await resolveRelationship(viewer.id, contactId);
    if (!relationship) {
      res.status(404).json({ error: 'No relationship found with this contact.' });
      return;
    }

    const { amount, direction } = await getBalance(relationship.id, viewer.id);
    if (direction !== 'owed') {
      res.status(400).json({ error: 'You are not owed money in this relationship.' });
      return;
    }

    const contactUserId = relationship.userAId === viewer.id ? relationship.userBId : relationship.userAId;
    const contact = await findUserById(contactUserId);
    if (!contact || !contact.telegramId) {
      res.status(400).json({ error: 'Contact has no Telegram account.' });
      return;
    }

    const acct = accounts[0];
    const contactT = useT(contact.language);
    const sym = currencySymbol(relationship.currency, contact.language);
    const senderName = getDisplayName(viewer);

    await bot.telegram.sendMessage(
      contact.telegramId,
      contactT.settlementRequestReceivedWithAccount(
        senderName,
        sym,
        amount.toFixed(2),
        acct.bankName,
        acct.cardNumber,
        acct.accountNumber,
      ),
      { parse_mode: 'Markdown' },
    ).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to send settlement request.' });
  }
}
