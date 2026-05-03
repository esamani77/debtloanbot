import { Language } from '@prisma/client';
import { en } from './en';
import { fa } from './fa';
import { Translations } from './types';

const map: Record<Language, Translations> = { EN: en, FA: fa };

export function useT(lang: Language | undefined): Translations {
  return map[lang ?? Language.EN] ?? en;
}

export type { Translations };
