import { Scenes, Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { setNickname, getDisplayName, findUserByTelegramId } from '../../services/userService';
import { useT } from '../../i18n';
import { mainMenuKeyboard } from '../commands/language';

interface NicknameWizardState {
  telegramName?: string;
  mode?: 'onboarding' | 'edit';
}

export const nicknameSetupScene = new Scenes.WizardScene<BotContext>(
  'NICKNAME_SETUP',

  // Step 0: Show nickname prompt
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as NicknameWizardState;
    const defaultName = state.telegramName ?? ctx.from?.first_name ?? '?';

    await ctx.reply(T.nicknamePrompt(defaultName), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnKeepTelegramName, 'nn_keep')],
        [Markup.button.callback(T.btnCancel, 'nn_cancel')],
      ]),
    });
    return ctx.wizard.next();
  },

  // Step 1: Handle nickname input
  async (ctx) => {
    const T = useT(ctx.session.userLanguage ?? Language.EN);
    const state = ctx.wizard.state as NicknameWizardState;

    if (!ctx.from) {
      await ctx.reply(T.errCannotIdentify);
      return ctx.scene.leave();
    }

    const telegramId = String(ctx.from.id);

    if (ctx.callbackQuery && 'data' in ctx.callbackQuery) {
      await ctx.answerCbQuery();

      if (ctx.callbackQuery.data === 'nn_cancel') {
        await ctx.editMessageText(T.acctCancelled);
        return ctx.scene.leave();
      }

      if (ctx.callbackQuery.data === 'nn_keep') {
        await setNickname(telegramId, null);
        const user = await findUserByTelegramId(telegramId);
        const displayName = user ? getDisplayName(user) : (state.telegramName ?? '');

        if (state.mode === 'onboarding') {
          await ctx.editMessageText(T.nicknameSet(displayName), { parse_mode: 'Markdown' });
          await ctx.reply('​', { parse_mode: 'Markdown', ...mainMenuKeyboard(T) });
        } else {
          await ctx.editMessageText(T.nicknameUpdated(displayName), { parse_mode: 'Markdown' });
        }
        return ctx.scene.leave();
      }
    }

    if (!ctx.message || !('text' in ctx.message)) {
      return;
    }

    const trimmed = ctx.message.text.trim();
    if (!trimmed) {
      await ctx.reply(T.nicknamePrompt(state.telegramName ?? ''), {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(T.btnKeepTelegramName, 'nn_keep')],
          [Markup.button.callback(T.btnCancel, 'nn_cancel')],
        ]),
      });
      return;
    }

    await setNickname(telegramId, trimmed);

    if (state.mode === 'onboarding') {
      await ctx.reply(T.nicknameSet(trimmed), {
        parse_mode: 'Markdown',
        ...mainMenuKeyboard(T),
      });
    } else {
      await ctx.reply(T.nicknameUpdated(trimmed), { parse_mode: 'Markdown' });
    }
    return ctx.scene.leave();
  },
);
