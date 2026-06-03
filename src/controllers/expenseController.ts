import { Request, Response } from 'express';
import { Currency } from '@prisma/client';
import { findUserById } from '../services/userService';
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  linkExpenseToTransaction,
  unlinkExpenseFromTransaction,
  getExpenseStats,
} from '../services/expenseService';

export async function listExpenses(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const month = req.query.month ? parseInt(req.query.month as string) : undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const categoryId = req.query.categoryId as string | undefined;

  const expenses = await getExpenses(user.id, { month, year, categoryId });
  res.json(expenses);
}

export async function createExpenseHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const { title, amount, currency, categoryId, note, date, transactionId } = req.body;
  if (!title || amount == null || !currency || !categoryId) {
    return res.status(400).json({ error: 'title, amount, currency, and categoryId are required' });
  }
  if (!Object.values(Currency).includes(currency)) {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  try {
    const expense = await createExpense(user.id, {
      title,
      amount: parseFloat(amount),
      currency: currency as Currency,
      categoryId,
      note,
      date: date ? new Date(date) : undefined,
      transactionId,
    });
    res.status(201).json(expense);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create expense' });
  }
}

export async function getExpenseStatsHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const now = new Date();
  const month = req.query.month ? parseInt(req.query.month as string) : now.getMonth() + 1;
  const year = req.query.year ? parseInt(req.query.year as string) : now.getFullYear();

  const stats = await getExpenseStats(user.id, month, year);
  res.json(stats);
}

export async function getExpenseHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const expense = await getExpenseById(String(req.params.id), user.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  res.json(expense);
}

export async function updateExpenseHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const { title, amount, currency, categoryId, note, date } = req.body;

  try {
    const updated = await updateExpense(String(req.params.id), user.id, {
      title,
      amount: amount != null ? parseFloat(amount) : undefined,
      currency: currency as Currency | undefined,
      categoryId,
      note,
      date: date ? new Date(date) : undefined,
    });
    if (!updated) return res.status(404).json({ error: 'Expense not found' });
    res.json(updated);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to update expense' });
  }
}

export async function deleteExpenseHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const deleted = await deleteExpense(String(req.params.id), user.id);
  if (!deleted) return res.status(404).json({ error: 'Expense not found' });
  res.status(204).send();
}

export async function linkTransactionHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  const { transactionId } = req.body;
  if (!transactionId) return res.status(400).json({ error: 'transactionId is required' });

  try {
    const expense = await linkExpenseToTransaction(String(req.params.id), transactionId, user.id);
    res.json(expense);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to link transaction' });
  }
}

export async function unlinkTransactionHandler(req: Request, res: Response) {
  const user = await findUserById(res.locals.userId as string);
  if (!user) return res.status(401).json({ error: 'User not found.' });

  try {
    const expense = await unlinkExpenseFromTransaction(String(req.params.id), user.id);
    res.json(expense);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to unlink transaction' });
  }
}
