import type { Telegram } from "telegraf";
import { Language } from "@prisma/client";
import prisma from "../db/prisma";
import { useT } from "../i18n";
import { currencySymbol } from "./currency";
import type { Transfer } from "./debtSimplification";

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
    if (/^\d+$/.test(rawId)) {
      if (rawId === creatorTelegramId) continue;
      chatId = rawId;
    } else if (rawId.startsWith("@")) {
      const user = await prisma.user.findFirst({
        where: { username: rawId.slice(1).toLowerCase() },
        select: { telegramId: true },
      });
      if (user?.telegramId) {
        if (user.telegramId === creatorTelegramId) continue;
        chatId = user.telegramId;
      }
    }
    if (!chatId) continue;

    const dbUser = await prisma.user.findFirst({
      where: { telegramId: chatId },
      select: { language: true },
    });
    const language = dbUser?.language ?? Language.EN;
    const T = useT(language);
    const sym = currencySymbol(currency as any, language);

    const myName = participants[i];
    const myBalance = netBalances[i];
    const myTransfers = transfers.filter(
      (t) => t.from === myName || t.to === myName,
    );

    const msg = T.splitNotifyResultsReady(
      creatorName,
      sessionName,
      sym,
      myBalance,
      myTransfers,
      shareLink,
    );
    await telegram
      .sendMessage(chatId, msg, { parse_mode: "Markdown" })
      .catch(() => {});
  }
}
