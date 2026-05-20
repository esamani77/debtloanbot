import { Context, Scenes } from 'telegraf';
import { Currency, Language, TransactionType } from '@prisma/client';

export interface BillDraft {
  name: string;
  totalAmount: number;
  paidByIndex: number;
  splitType: 'EQUAL' | 'PERCENTAGE' | 'CUSTOM';
  shares: number[];
}

export interface SplitDraft {
  sessionName?: string;
  currency?: Currency;
  participantCount?: number;
  participants: string[];
  bills: BillDraft[];
  currentBill: Partial<BillDraft>;
  currentShareIndex: number;
  sessionId?: string;
  netBalances?: number[];
  shareToken?: string;
}

// Must extend WizardSession so the stage middleware can store __scenes on the session
export interface SessionData extends Scenes.WizardSession {
  activeContactId?: string;
  activeContactName?: string;
  userLanguage?: Language;
  pendingInvite?: string;
  pendingSplitToken?: string;
  feedbackTargetTelegramId?: string;
  feedbackTargetName?: string;
  splitDraft?: SplitDraft;
}

export interface BotContext extends Context {
  session: SessionData;
  scene: Scenes.SceneContextScene<BotContext, Scenes.WizardSessionData>;
  wizard: Scenes.WizardContextWizard<BotContext>;
  // Populated by bot.action(regex, ...) handlers
  match?: RegExpExecArray;
}

export interface BalanceResult {
  contactName: string;
  amount: number;
  direction: 'owed' | 'owes' | 'settled';
}

export interface TransactionSummary {
  id: string;
  amount: number;
  type: TransactionType;
  addedByViewer: boolean;
  addedByName: string;
  note?: string;
  createdAt: Date;
}
