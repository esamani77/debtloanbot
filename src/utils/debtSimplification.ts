import { Currency } from '@prisma/client';

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

function roundForCurrency(amount: number, currency: Currency): number {
  if (currency === Currency.IRT) return Math.round(amount / 1000) * 1000;
  return Math.round(amount * 100) / 100;
}

export function computeNetBalances(
  participants: string[],
  bills: Array<{ totalAmount: number; paidByIndex: number; shares: number[] }>,
): number[] {
  const n = participants.length;
  const paid = new Array<number>(n).fill(0);
  const owed = new Array<number>(n).fill(0);

  for (const bill of bills) {
    paid[bill.paidByIndex] += bill.totalAmount;
    for (let i = 0; i < n; i++) {
      owed[i] += bill.shares[i] ?? 0;
    }
  }

  return participants.map((_, i) => paid[i] - owed[i]);
}

export function simplifyDebts(
  participants: string[],
  netBalances: number[],
  currency: Currency,
): Transfer[] {
  const EPSILON = currency === Currency.IRT ? 500 : 0.005;

  const creditors: Array<[number, string]> = [];
  const debtors: Array<[number, string]> = [];

  for (let i = 0; i < participants.length; i++) {
    const bal = netBalances[i];
    if (bal > EPSILON) creditors.push([bal, participants[i]]);
    else if (bal < -EPSILON) debtors.push([-bal, participants[i]]);
  }

  creditors.sort((a, b) => b[0] - a[0]);
  debtors.sort((a, b) => b[0] - a[0]);

  const transfers: Transfer[] = [];

  while (creditors.length > 0 && debtors.length > 0) {
    const creditAmt = creditors[0][0];
    const creditor = creditors[0][1];
    const debitAmt = debtors[0][0];
    const debtor = debtors[0][1];

    const transferAmt = roundForCurrency(Math.min(creditAmt, debitAmt), currency);
    if (transferAmt > 0) {
      transfers.push({ from: debtor, to: creditor, amount: transferAmt });
    }

    creditors[0][0] -= transferAmt;
    debtors[0][0] -= transferAmt;

    if (creditors[0][0] <= EPSILON) creditors.shift();
    if (debtors[0][0] <= EPSILON) debtors.shift();
  }

  return transfers;
}

export function computeEqualShares(totalAmount: number, n: number, _currency: Currency): number[] {
  if (n === 0) return [];
  const share = Math.round((totalAmount / n) * 1000) / 1000;
  return new Array<number>(n).fill(share);
}
