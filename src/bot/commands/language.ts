import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserById, setUserLanguage } from '../../services/userService';
import { getOrCreateRelationship } from '../../services/relationshipService';
import { parseInvitePayload } from '../../utils/inviteLink';
import { useT } from '../../i18n';

export async function setLangAction(ctx: BotContext, language: Language): Promise<void> {
  if (!ctx.from) {
    await ctx.answerCbQuery();
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  await ctx.answerCbQuery();

  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    // Create or fetch user, then set their language
    let user = await findOrCreateUser(telegramId, name);
    user = await setUserLanguage(telegramId, language);
    ctx.session.userLanguage = language;

    const T = useT(language);

    // Process any pending invite from the /start payload
    const pendingInvite = ctx.session.pendingInvite;
    ctx.session.pendingInvite = undefined;

    if (pendingInvite) {
      const inviterId = parseInvitePayload(pendingInvite);

      if (inviterId && inviterId !== user.id) {
        const inviter = await findUserById(inviterId);

        if (!inviter) {
          await ctx.editMessageText(T.startInviteInvalid(name), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(T.btnInviteFriend, 'get_invite_link')],
              [Markup.button.callback(T.btnHelp, 'show_help')],
            ]),
          });
          return;
        }

        const { created } = await getOrCreateRelationship(user.id, inviter.id);

        if (created) {
          await ctx.editMessageText(T.startConnected(name, inviter.name), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(T.btnContacts, 'go_contacts')],
              [Markup.button.callback(T.btnAdd, 'add_transaction')],
              [Markup.button.callback(T.btnHelp, 'show_help')],
            ]),
          });

          // Notify the inviter in their own language
          const inviterT = useT(inviter.language);
          ctx.telegram
            .sendMessage(inviter.telegramId, inviterT.startInviterNotified(name), {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback(inviterT.btnContacts, 'go_contacts')],
              ]),
            })
            .catch(() => {});
        } else {
          await ctx.editMessageText(T.startAlreadyConnected(name, inviter.name), {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback(T.btnContacts, 'go_contacts')],
              [Markup.button.callback(T.btnHelp, 'show_help')],
            ]),
          });
        }
        return;
      }
    }

    // Standard welcome (new or returning user)
    const isReturning = user.createdAt.getTime() < Date.now() - 5000;
    const welcomeText = isReturning ? T.startWelcomeBack(name) : T.startWelcome(name);

    await ctx.editMessageText(welcomeText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(T.btnInviteFriend, 'get_invite_link')],
        [Markup.button.callback(T.btnContacts, 'go_contacts')],
        [Markup.button.callback(T.btnHelp, 'show_help')],
      ]),
    });
  } catch (error) {
    const T = useT(language);
    await ctx.reply(T.errSomethingWrong);
    console.error('setLang action error:', error);
  }
}
