import { Scenes, Markup } from "telegraf";
import { Language } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findUserByTelegramId } from "../../services/userService";
import { useT } from "../../i18n";

export const feedbackScene = new Scenes.WizardScene<BotContext>(
  "FEEDBACK",

  // Step 0: Send feedback prompt (target info read from session, not wizard state)
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const targetName = ctx.session.feedbackTargetName ?? "?";

    await ctx.reply(T.feedbackPrompt(targetName), {
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnSkipFeedback, "feedback_skip")],
      ]),
    });

    return ctx.wizard.next();
  },

  // Step 1: Forward the message to User A, or handle skip
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const targetId = ctx.session.feedbackTargetTelegramId;
    const senderName = ctx.session.feedbackTargetName ?? "?";

    if (!targetId) return ctx.scene.leave();

    // Handle inline button responses
    if (ctx.callbackQuery && "data" in ctx.callbackQuery) {
      await ctx.answerCbQuery();
      if (ctx.callbackQuery.data === "feedback_skip") {
        ctx.session.feedbackTargetTelegramId = undefined;
        ctx.session.feedbackTargetName = undefined;
        await ctx.editMessageText(T.feedbackSkipped);
        return ctx.scene.leave();
      }
      // Unrelated callback while waiting — ignore, stay in step 1
      return;
    }

    // Must be a message update (text, photo, sticker, animation, etc.)
    if (!ctx.message) return;

    ctx.session.feedbackTargetTelegramId = undefined;
    ctx.session.feedbackTargetName = undefined;

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
