import { Markup } from "telegraf";
import { BotContext } from "../../models/types";
import { parseInvitePayload } from "../../utils/inviteLink";

export async function startHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply("Could not identify user. Please try again.");
    return;
  }

  // Preserve invite / split payload across the language picker step
  const payload = (ctx as BotContext & { startPayload?: string }).startPayload;
  if (payload && payload.startsWith('split_')) {
    ctx.session.pendingSplitToken = payload.slice(6); // strip 'split_'
    ctx.session.pendingInvite = undefined;
  } else if (payload && parseInvitePayload(payload)) {
    ctx.session.pendingInvite = payload;
    ctx.session.pendingSplitToken = undefined;
  } else {
    ctx.session.pendingInvite = undefined;
    ctx.session.pendingSplitToken = undefined;
  }

  await ctx.reply(
    "🌐 Choose your language:\n\nزبان خود را انتخاب کنید:",
    Markup.keyboard([
      [Markup.button.text("🇬🇧 English"), Markup.button.text("🇮🇷 فارسی")],
    ]).resize().oneTime(),
  );
}
