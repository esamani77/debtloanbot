import { Transaction, TransactionType } from '@prisma/client';

/**
 * Calculates net balance from the viewer's perspective.
 * Positive = viewer is owed money. Negative = viewer owes money.
 */
export function calculateNetBalance(
  transactions: Pick<Transaction, 'amount' | 'type' | 'createdById'>[],
  viewerId: string
): number {
  return transactions.reduce((sum, tx) => {
    const byViewer = tx.createdById === viewerId;
    if (tx.type === TransactionType.LOAN) {
      return sum + (byViewer ? tx.amount : -tx.amount);
    } else {
      return sum + (byViewer ? -tx.amount : tx.amount);
    }
  }, 0);
}
