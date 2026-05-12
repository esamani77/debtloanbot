import { Transaction, TransactionType } from '@prisma/client';
import prisma from '../db/prisma';
import { calculateNetBalance } from '../utils/balanceCalc';
import { TransactionSummary } from '../models/types';
import { getDisplayName } from './userService';

interface AddTransactionParams {
  relationshipId: string;
  createdById: string;
  amount: number;
  type: TransactionType;
  note?: string;
}

/**
 * Adds a new transaction to a relationship.
 * Validates that the amount is a positive number.
 */
export async function addTransaction(params: AddTransactionParams): Promise<Transaction> {
  const { relationshipId, createdById, amount, type, note } = params;

  if (amount <= 0) {
    throw new Error('Transaction amount must be a positive number.');
  }

  try {
    return await prisma.transaction.create({
      data: {
        relationshipId,
        createdById,
        amount,
        type,
        note: note ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to create transaction:', error);
    throw new Error('Could not save transaction. Please try again.');
  }
}

/**
 * Calculates the net balance for a relationship from the viewer's perspective.
 * Returns the amount, direction, and the contact's name.
 */
export async function getBalance(
  relationshipId: string,
  viewerId: string
): Promise<{ amount: number; direction: 'owed' | 'owes' | 'settled'; contactName: string }> {
  try {
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
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

    if (!relationship) {
      throw new Error('Relationship not found.');
    }

    const contact = relationship.userAId === viewerId ? relationship.userB : relationship.userA;
    const netBalance = calculateNetBalance(relationship.transactions, viewerId);
    const absAmount = Math.abs(netBalance);

    let direction: 'owed' | 'owes' | 'settled';
    if (netBalance > 0) {
      direction = 'owed'; // viewer is owed money
    } else if (netBalance < 0) {
      direction = 'owes'; // viewer owes money
    } else {
      direction = 'settled';
    }

    return {
      amount: absAmount,
      direction,
      contactName: getDisplayName(contact),
    };
  } catch (error) {
    console.error('Failed to fetch balance:', error);
    throw new Error('Could not retrieve balance. Please try again.');
  }
}

/**
 * Retrieves recent transactions for a relationship, formatted for display.
 */
export async function getRecentTransactions(
  relationshipId: string,
  viewerId: string,
  limit = 10
): Promise<TransactionSummary[]> {
  try {
    const relationship = await prisma.relationship.findUnique({
      where: { id: relationshipId },
      include: {
        userA: true,
        userB: true,
      },
    });

    if (!relationship) {
      throw new Error('Relationship not found.');
    }

    const transactions = await prisma.transaction.findMany({
      where: { relationshipId },
      include: {
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return transactions.map((tx) => ({
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      addedByViewer: tx.createdById === viewerId,
      addedByName: getDisplayName(tx.createdBy),
      note: tx.note ?? undefined,
      createdAt: tx.createdAt,
    }));
  } catch (error) {
    console.error('Failed to fetch transactions:', error);
    throw new Error('Could not retrieve transactions. Please try again.');
  }
}
