import { Request, Response } from 'express';
import { Currency } from '@prisma/client';
import { findOrCreateUser } from '../services/userService';
import { updateRelationshipCurrency } from '../services/relationshipService';
import { ALL_CURRENCIES } from '../utils/currency';
import prisma from '../db/prisma';

export async function patchRelationshipCurrency(req: Request, res: Response): Promise<void> {
  const { currency } = req.body as { currency?: string };

  if (!currency || !ALL_CURRENCIES.includes(currency as Currency)) {
    res.status(400).json({ error: `currency must be one of: ${ALL_CURRENCIES.join(', ')}.` });
    return;
  }

  try {
    const viewer = await findOrCreateUser(res.locals.telegramId, res.locals.telegramName);
    const relationshipId = req.params.id as string;

    // Verify the viewer is part of this relationship
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
    });

    if (!relationship) {
      res.status(404).json({ error: 'Relationship not found.' });
      return;
    }

    if (relationship.userAId !== viewer.id && relationship.userBId !== viewer.id) {
      res.status(403).json({ error: 'You are not part of this relationship.' });
      return;
    }

    await updateRelationshipCurrency(relationshipId, currency as Currency);
    res.json({ success: true, currency });
  } catch {
    res.status(500).json({ error: 'Failed to update currency.' });
  }
}
