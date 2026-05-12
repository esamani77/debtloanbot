import { BankAccount } from '@prisma/client';
import prisma from '../db/prisma';

export async function getUserBankAccounts(userId: string): Promise<BankAccount[]> {
  return prisma.bankAccount.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getBankAccountById(id: string): Promise<BankAccount | null> {
  return prisma.bankAccount.findUnique({ where: { id } });
}

export async function addBankAccount(
  userId: string,
  data: { name: string; cardNumber: string; accountNumber: string; bankName: string },
): Promise<BankAccount> {
  return prisma.bankAccount.create({ data: { userId, ...data } });
}

export async function updateBankAccount(
  id: string,
  userId: string,
  data: { name: string; cardNumber: string; accountNumber: string; bankName: string },
): Promise<BankAccount | null> {
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;
  return prisma.bankAccount.update({ where: { id }, data });
}

export async function deleteBankAccount(id: string, userId: string): Promise<boolean> {
  const existing = await prisma.bankAccount.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return false;
  await prisma.bankAccount.delete({ where: { id } });
  return true;
}
