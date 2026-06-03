import { Request, Response } from 'express';
import { Currency } from '@prisma/client';
import { findUserById } from '../services/userService';
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
    const viewer = await findUserById(res.locals.userId as string);
    if (!viewer) { res.status(401).json({ error: 'User not found.' }); return; }
    const relationshipId = req.params.id as string;

    const relationship = await prisma.relationship.findUnique({ where: { id: relationshipId } });

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
