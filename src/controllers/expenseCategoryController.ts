import { Request, Response } from 'express';
import { findUserByTelegramId } from '../services/userService';
import {
  getUserCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../services/expenseCategoryService';

export async function listCategories(req: Request, res: Response) {
  const user = await findUserByTelegramId(res.locals.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const categories = await getUserCategories(user.id);
  res.json(categories);
}

export async function createCategoryHandler(req: Request, res: Response) {
  const user = await findUserByTelegramId(res.locals.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, icon, color } = req.body;
  if (!name || !icon || !color) return res.status(400).json({ error: 'name, icon, and color are required' });

  const category = await createCategory(user.id, { name, icon, color });
  res.status(201).json(category);
}

export async function updateCategoryHandler(req: Request, res: Response) {
  const user = await findUserByTelegramId(res.locals.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const id = String(req.params.id);
  const { name, icon, color } = req.body;

  const updated = await updateCategory(id, user.id, { name, icon, color });
  if (!updated) return res.status(404).json({ error: 'Category not found or is a system category' });
  res.json(updated);
}

export async function deleteCategoryHandler(req: Request, res: Response) {
  const user = await findUserByTelegramId(res.locals.telegramId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const result = await deleteCategory(String(req.params.id), user.id);
  if (result === 'not_found') return res.status(404).json({ error: 'Category not found or is a system category' });
  if (result === 'in_use') return res.status(409).json({ error: 'Category is in use by existing expenses' });
  res.status(204).send();
}
