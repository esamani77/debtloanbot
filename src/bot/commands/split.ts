import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { useT } from '../../i18n';
import { findUserByTelegramId } from '../../services/userService';
import { getDraftSession, deleteSession } from '../../services/splitService';
import { Markup } from 'telegraf';

export async function splitHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  const t = useT(ctx.session.userLanguage ?? Language.EN);

  const viewer = await findUserByTelegramId(String(ctx.from.id));
  if (!viewer) {
    await ctx.reply(t.errUserNotFound);
    return;
  }

  const draft = await getDraftSession(viewer.id);
  if (draft) {
    await ctx.reply(t.splitDraftFound(draft.name ?? null), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(t.splitBtnResume, `split_resume:${draft.id}`),
          Markup.button.callback(t.splitBtnStartNew, `split_new:${draft.id}`),
        ],
      ]),
    });
    return;
  }

  await ctx.scene.enter('SPLIT');
}
