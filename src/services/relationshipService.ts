import { Relationship, User } from '@prisma/client';
import prisma from '../db/prisma';
import { calculateNetBalance } from '../utils/balanceCalc';

/**
 * Gets an existing relationship or creates a new one between two users.
 * IDs are sorted lexicographically to prevent duplicate relationships.
 */
export async function getOrCreateRelationship(
  userAId: string,
  userBId: string
): Promise<{ relationship: Relationship; created: boolean }> {
  const [firstId, secondId] = [userAId, userBId].sort();

  const existing = await prisma.relationship.findUnique({
    where: {
      userAId_userBId: {
        userAId: firstId,
        userBId: secondId,
      },
    },
  });

  if (existing) {
    return { relationship: existing, created: false };
  }

  const created = await prisma.relationship.create({
    data: {
      userAId: firstId,
      userBId: secondId,
    },
  });

  return { relationship: created, created: true };
}

/**
 * Finds a relationship between two users if one exists.
 * IDs are sorted to ensure consistent lookup.
 */
export async function getRelationshipBetween(
  userAId: string,
  userBId: string
): Promise<Relationship | null> {
  const [firstId, secondId] = [userAId, userBId].sort();

  return prisma.relationship.findUnique({
    where: {
      userAId_userBId: {
        userAId: firstId,
        userBId: secondId,
      },
    },
  });
}

/**
 * Returns all relationships for a user, including the contact user object
 * and pre-computed net balance from the user's perspective.
 */
export async function getUserRelationships(
  userId: string
): Promise<Array<{ relationship: Relationship; contact: User; netBalance: number }>> {
  const relationships = await prisma.relationship.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
    },
    include: {
      userA: true,
      userB: true,
      transactions: {
        select: {
          amount: true,
          type: true,
          createdById: true,
        },
      },
    },
  });

  return relationships.map((rel) => {
    const contact = rel.userAId === userId ? rel.userB : rel.userA;
    const netBalance = calculateNetBalance(rel.transactions, userId);

    return {
      relationship: {
        id: rel.id,
        userAId: rel.userAId,
        userBId: rel.userBId,
        createdAt: rel.createdAt,
      },
      contact,
      netBalance,
    };
  });
}
