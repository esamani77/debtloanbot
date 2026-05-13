import { Context, Scenes } from 'telegraf';
import { Language, TransactionType } from '@prisma/client';

// Must extend WizardSession so the stage middleware can store __scenes on the session
export interface SessionData extends Scenes.WizardSession {
  activeContactId?: string;
  activeContactName?: string;
  userLanguage?: Language;
  pendingInvite?: string;
  feedbackTargetTelegramId?: string;
  feedbackTargetName?: string;
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
