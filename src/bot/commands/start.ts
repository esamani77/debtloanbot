import { Markup } from "telegraf";
import { BotContext } from "../../models/types";
import { parseInvitePayload } from "../../utils/inviteLink";
import { setLangAction } from "./language";
import prisma from "../../db/prisma";

export async function startHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply("Could not identify user. Please try again.");
    return;
  }

  const telegramId = String(ctx.from.id);
  const payload = (ctx as BotContext & { startPayload?: string }).startPayload;

  if (payload && payload.startsWith('split_')) {
    ctx.session.pendingSplitToken = payload.slice(6);
    ctx.session.pendingInvite = undefined;
    // Clear any stale DB invite so a split link doesn't accidentally trigger it later
    await prisma.pendingInvite.deleteMany({ where: { telegramId } });
  } else if (payload && parseInvitePayload(payload)) {
    ctx.session.pendingInvite = payload;
    ctx.session.pendingSplitToken = undefined;
    // Persist to DB so the invite survives a bot restart between now and language selection
    await prisma.pendingInvite.upsert({
      where: { telegramId },
      update: { payload },
      create: { telegramId, payload },
    });
  } else {
    ctx.session.pendingInvite = undefined;
    ctx.session.pendingSplitToken = undefined;
    await prisma.pendingInvite.deleteMany({ where: { telegramId } });
  }

  // For users whose language is already known, skip the picker and proceed directly
  if (ctx.session.userLanguage) {
    await setLangAction(ctx, ctx.session.userLanguage);
    return;
  }

  await ctx.reply(
    "🌐 Choose your language:\n\nزبان خود را انتخاب کنید:",
    Markup.keyboard([
      [Markup.button.text("🇬🇧 English"), Markup.button.text("🇮🇷 فارسی")],
    ]).resize().oneTime(),
  );
}
