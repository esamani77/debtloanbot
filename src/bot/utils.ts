import { BotContext } from '../models/types';

type ReplyExtra = Parameters<BotContext['reply']>[1];

/**
 * Edits the current message when called from a button callback,
 * falls back to sending a new message from text commands.
 */
export async function replyOrEdit(ctx: BotContext, text: string, extra?: ReplyExtra): Promise<void> {
  if (ctx.callbackQuery && 'message' in ctx.callbackQuery) {
    try {
      await ctx.editMessageText(text, extra as Parameters<BotContext['editMessageText']>[1]);
      return;
    } catch {
      // "message is not modified" or message too old — fall through to reply
    }
  }
  await ctx.reply(text, extra);
}
