import { Request, Response } from 'express';
import { findOrCreateUser, findUserById } from '../services/userService';
import {
  getUserBankAccounts,
  getBankAccountById,
  addBankAccount,
  updateBankAccount,
  deleteBankAccount,
} from '../services/bankAccountService';

function serializeAccount(a: {
  id: string;
  name: string;
  cardNumber: string;
  accountNumber: string;
  bankName: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: a.id,
    name: a.name,
    cardNumber: a.cardNumber,
    accountNumber: a.accountNumber,
    bankName: a.bankName,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

function parseBody(body: unknown): { name: string; cardNumber: string; accountNumber: string; bankName: string } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (
    typeof b.name !== 'string' || !b.name.trim() ||
    typeof b.cardNumber !== 'string' ||
    typeof b.accountNumber !== 'string' || !b.accountNumber.trim() ||
    typeof b.bankName !== 'string' || !b.bankName.trim()
  ) return null;

  const digits = b.cardNumber.replace(/\D/g, '');
  if (digits.length !== 16) return null;

  return {
    name: b.name.trim(),
    cardNumber: digits,
    accountNumber: (b.accountNumber as string).trim(),
    bankName: (b.bankName as string).trim(),
  };
}

export async function listMyBankAccounts(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const accounts = await getUserBankAccounts(viewer.id);
    res.json(accounts.map(serializeAccount));
  } catch {
    res.status(500).json({ error: 'Failed to fetch bank accounts.' });
  }
}

export async function createBankAccount(req: Request, res: Response): Promise<void> {
  const data = parseBody(req.body);
  if (!data) {
    res.status(400).json({
      error: 'name, cardNumber (16 digits), accountNumber, and bankName are required.',
    });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const account = await addBankAccount(viewer.id, data);
    res.status(201).json(serializeAccount(account));
  } catch {
    res.status(500).json({ error: 'Failed to create bank account.' });
  }
}

export async function updateBankAccountHandler(req: Request, res: Response): Promise<void> {
  const data = parseBody(req.body);
  if (!data) {
    res.status(400).json({
      error: 'name, cardNumber (16 digits), accountNumber, and bankName are required.',
    });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const updated = await updateBankAccount(String(req.params.id), viewer.id, data);
    if (!updated) {
      res.status(404).json({ error: 'Bank account not found.' });
      return;
    }
    res.json(serializeAccount(updated));
  } catch {
    res.status(500).json({ error: 'Failed to update bank account.' });
  }
}

export async function deleteBankAccountHandler(req: Request, res: Response): Promise<void> {
  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const deleted = await deleteBankAccount(String(req.params.id), viewer.id);
    if (!deleted) {
      res.status(404).json({ error: 'Bank account not found.' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'Failed to delete bank account.' });
  }
}

export async function getContactBankAccounts(req: Request, res: Response): Promise<void> {
  try {
    const contact = await findUserById(String(req.params.id));
    if (!contact) {
      res.status(404).json({ error: 'Contact not found.' });
      return;
    }
    const accounts = await getUserBankAccounts(contact.id);
    res.json(accounts.map(serializeAccount));
  } catch {
    res.status(500).json({ error: 'Failed to fetch contact bank accounts.' });
  }
}
