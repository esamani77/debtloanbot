import { Scenes, Markup } from "telegraf";
import { Language } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findUserByTelegramId } from "../../services/userService";
import { useT } from "../../i18n";

export const feedbackScene = new Scenes.BaseScene<BotContext>("FEEDBACK");

feedbackScene.enter(async (ctx) => {
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const targetName = ctx.session.feedbackTargetName ?? "?";
  await ctx.reply(T.feedbackPrompt(targetName), {
    parse_mode: "Markdown",
    ...Markup.inlineKeyboard([
      [Markup.button.callback(T.btnSkipFeedback, "feedback_skip")],
    ]),
  });
});

feedbackScene.action("feedback_skip", async (ctx) => {
  await ctx.answerCbQuery();
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  ctx.session.feedbackTargetTelegramId = undefined;
  ctx.session.feedbackTargetName = undefined;
  await ctx.editMessageText(T.feedbackSkipped);
  return ctx.scene.leave();
});

feedbackScene.on("message", async (ctx) => {
  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const targetId = ctx.session.feedbackTargetTelegramId;

  if (!targetId) return ctx.scene.leave();

  ctx.session.feedbackTargetTelegramId = undefined;
  ctx.session.feedbackTargetName = undefined;

  try {
    const senderUser = await findUserByTelegramId(String(ctx.from!.id));
    const senderName = senderUser?.name ?? ctx.from?.first_name ?? "?";

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
      .forwardMessage(targetId, ctx.message!.chat.id, ctx.message!.message_id)
      .catch(() => {});

    await ctx.reply(T.feedbackSent);
  } catch {
    await ctx.reply(T.errSomethingWrong);
  }

  return ctx.scene.leave();
});
