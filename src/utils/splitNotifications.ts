import type { Telegram } from "telegraf";
import { Language } from "@prisma/client";
import prisma from "../db/prisma";
import { useT } from "../i18n";
import { currencySymbol } from "./currency";
import type { Transfer } from "./debtSimplification";
import { createAndNotify, NotificationType } from "../services/notificationService";

const BOT_USERNAME = process.env.BOT_USERNAME ?? "debt_mate_bot";

export async function notifySplitParticipants({
  telegram,
  sessionName,
  currency,
  participants,
  participantTelegramIds,
  netBalances,
  transfers,
  shareToken,
  creatorName,
  creatorTelegramId,
}: {
  telegram: Telegram;
  sessionName: string | null;
  currency: string;
  participants: string[];
  participantTelegramIds: string[];
  netBalances: number[];
  transfers: Transfer[];
  shareToken: string;
  creatorName: string;
  creatorTelegramId?: string | null;
}): Promise<void> {
  const shareLink = `https://t.me/${BOT_USERNAME}?start=split_${shareToken}`;

  for (let i = 0; i < participants.length; i++) {
    const rawId = participantTelegramIds[i];
    if (!rawId) continue;

    let chatId: string | undefined;
    let dbUser: { id: string; language: Language; telegramId: string | null } | null = null;

    if (/^\d+$/.test(rawId)) {
      if (rawId === creatorTelegramId) continue;
      chatId = rawId;
      dbUser = await prisma.user.findFirst({
        where: { telegramId: chatId },
        select: { id: true, language: true, telegramId: true },
      });
    } else if (rawId.startsWith("@")) {
      dbUser = await prisma.user.findFirst({
        where: { username: rawId.slice(1).toLowerCase() },
        select: { id: true, language: true, telegramId: true },
      });
      if (dbUser?.telegramId) {
        if (dbUser.telegramId === creatorTelegramId) continue;
        chatId = dbUser.telegramId;
      }
    }

    const language = dbUser?.language ?? Language.EN;
    const T = useT(language);
    const sym = currencySymbol(currency as Parameters<typeof currencySymbol>[0], language);

    const myName = participants[i];
    const myBalance = netBalances[i];
    const myTransfers = transfers.filter(
      (t) => t.from === myName || t.to === myName,
    );

    const tgMsg = T.splitNotifyResultsReady(
      creatorName,
      sessionName,
      sym,
      myBalance,
      myTransfers,
      shareLink,
    );

    if (dbUser) {
      createAndNotify(
        dbUser.id,
        NotificationType.SPLIT_SHARED,
        T.notifyPushTitleSplitResults(creatorName, sessionName),
        T.notifyPushBodySplitResults(sym, myBalance),
        { splitId: shareToken },
        tgMsg,
      ).catch(() => {});
    } else if (chatId) {
      // Participant isn't registered — Telegram-only fallback
      telegram.sendMessage(chatId, tgMsg, { parse_mode: "Markdown" }).catch(() => {});
    }
  }
}
