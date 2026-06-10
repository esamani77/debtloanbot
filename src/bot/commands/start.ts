import { Markup } from "telegraf";
import { BotContext } from "../../models/types";
import { parseInvitePayload } from "../../utils/inviteLink";
import { setLangAction } from "./language";
import prisma from "../../db/prisma";

export async function processStartPayload(ctx: BotContext, payload: string): Promise<void> {
  if (!ctx.from) return;
  const telegramId = String(ctx.from.id);

  if (payload.startsWith('connect_')) {
    const token = payload.slice(8);
    const { completeTelegramConnect } = await import('../../services/authService');
    const result = await completeTelegramConnect(
      token,
      String(ctx.from.id),
      ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : ''),
    );
    await ctx.reply(result.message);
    return;
  }

  if (payload.startsWith('split_')) {
    ctx.session.pendingSplitToken = payload.slice(6);
    ctx.session.pendingInvite = undefined;
    await prisma.pendingInvite.deleteMany({ where: { telegramId } });
  } else if (payload.startsWith('splitjoin_')) {
    ctx.session.pendingInvite = payload;
    ctx.session.pendingSplitToken = undefined;
    await prisma.pendingInvite.upsert({
      where: { telegramId },
      update: { payload },
      create: { telegramId, payload },
    });
  } else if (parseInvitePayload(payload)) {
    ctx.session.pendingInvite = payload;
    ctx.session.pendingSplitToken = undefined;
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
}

export async function startHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply("Could not identify user. Please try again.");
    return;
  }

  const payload = (ctx as BotContext & { startPayload?: string }).startPayload;
  if (payload) {
    await processStartPayload(ctx, payload);
  } else {
    const telegramId = String(ctx.from.id);
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
