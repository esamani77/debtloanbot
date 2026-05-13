import { Scenes, Markup } from "telegraf";
import { Language } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findUserByTelegramId } from "../../services/userService";
import { useT } from "../../i18n";

interface FeedbackState {
  targetTelegramId?: string;
  senderName?: string;
}

export const feedbackScene = new Scenes.WizardScene<BotContext>(
  "FEEDBACK",

  // Step 0: Send feedback prompt
  async (ctx) => {
    const state = ctx.wizard.state as FeedbackState;
    const T = useT(ctx.session.userLanguage ?? Language.EN);

    await ctx.reply(T.feedbackPrompt(state.senderName ?? "?"), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnSkipFeedback, "feedback_skip")],
      ]),
    });

    return ctx.wizard.next();
  },

  // Step 1: Forward the message to User A or handle skip
  async (ctx) => {
    const state = ctx.wizard.state as FeedbackState;
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const targetId = state.targetTelegramId;

    if (!targetId) return ctx.scene.leave();

    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === "feedback_skip") {
        await ctx.editMessageText(T.feedbackSkipped);
        return ctx.scene.leave();
      }
      // Unknown callback while in scene — ignore and keep waiting
      return;
    }

    if (!ctx.message) return;

    const senderName = state.senderName ?? "?";

    try {
      const targetUser = await findUserByTelegramId(targetId);
      if (targetUser) {
        const targetT = useT(targetUser.language);
        await ctx.telegram
          .sendMessage(targetId, targetT.feedbackReceived(senderName), {
            parse_mode: "Markdown",
          })
          .catch(() => {});
      }

      await ctx.telegram
        .forwardMessage(targetId, ctx.message.chat.id, ctx.message.message_id)
        .catch(() => {});

      await ctx.reply(T.feedbackSent);
    } catch {
      await ctx.reply(T.errSomethingWrong);
    }

    return ctx.scene.leave();
  },
);
