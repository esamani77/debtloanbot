import { Currency } from '@prisma/client';

const SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  IRT: 'T',
  TRY: '₺',
};

const LABELS: Record<Currency, string> = {
  USD: 'USD – US Dollar ($)',
  EUR: 'EUR – Euro (€)',
  GBP: 'GBP – British Pound (£)',
  IRT: 'IRT – Iranian Toman (تومان)',
  TRY: 'TRY – Turkish Lira (₺)',
};

export function currencySymbol(currency: Currency, language?: string): string {
  if ((currency as string) === 'IRT') return language === 'FA' ? 'تومان' : 'T';
  return SYMBOLS[currency];
}

export function currencyLabel(currency: Currency): string {
  return LABELS[currency];
}

export const ALL_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'IRT', 'TRY'];
