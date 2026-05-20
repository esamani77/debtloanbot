import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserById, setUserLanguage, getDisplayName } from '../../services/userService';
import { getOrCreateRelationship } from '../../services/relationshipService';
import { parseInvitePayload } from '../../utils/inviteLink';
import { useT } from '../../i18n';
import { getSessionByToken, getBankAccountsForParticipants } from '../../services/splitService';
import { computeNetBalances, simplifyDebts } from '../../utils/debtSimplification';
import { currencySymbol } from '../../utils/currency';

export function mainMenuKeyboard(T: ReturnType<typeof useT>) {
  return Markup.keyboard([
    [Markup.button.text(T.btnContacts), Markup.button.text(T.btnAdd)],
    [Markup.button.text(T.btnInviteFriend), Markup.button.text(T.btnProfile)],
    [Markup.button.text(T.btnSplit), Markup.button.text(T.btnHelp)],
  ]).resize();
}

export async function setLangAction(ctx: BotContext, language: Language): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const telegramId = String(ctx.from.id);
  const name = ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    let user = await findOrCreateUser(telegramId, name);
    user = await setUserLanguage(telegramId, language);
    ctx.session.userLanguage = language;

    const T = useT(language);
    const isNew = user.createdAt.getTime() > Date.now() - 5000;

    // Handle pending split share token
    const pendingSplitToken = ctx.session.pendingSplitToken;
    if (pendingSplitToken) {
      ctx.session.pendingSplitToken = undefined;
      const result = await getSessionByToken(pendingSplitToken);
      if (!result || result === 'expired') {
        await ctx.reply(result === 'expired' ? T.splitSessionExpired : T.splitSessionNotFound, { parse_mode: 'Markdown' });
      } else {
        const netBalances = computeNetBalances(result.participants, result.bills);
        const transfers = simplifyDebts(result.participants, netBalances, result.currency);
        const bankAccounts = await getBankAccountsForParticipants(result.participants);
        const sym = currencySymbol(result.currency);
        await ctx.reply(
          T.splitSharedSummary(result.name ?? null, result.currency, result.createdAt, result.participants, netBalances, transfers, sym, bankAccounts),
          { parse_mode: 'Markdown' },
        );
      }
      if (!isNew) await ctx.reply('​', { parse_mode: 'Markdown', ...mainMenuKeyboard(T) });
      else await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
      return;
    }

    const pendingInvite = ctx.session.pendingInvite;
    ctx.session.pendingInvite = undefined;

    if (pendingInvite) {
      const inviterId = parseInvitePayload(pendingInvite);

      if (inviterId && inviterId !== user.id) {
        const inviter = await findUserById(inviterId);

        if (!inviter) {
          await ctx.reply(T.startInviteInvalid(name), { parse_mode: 'Markdown' });
          if (isNew) {
            await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
          } else {
            await ctx.reply('​', {
              parse_mode: 'Markdown',
              ...Markup.keyboard([
                [Markup.button.text(T.btnInviteFriend), Markup.button.text(T.btnHelp)],
              ]).resize(),
            });
          }
          return;
        }

        const { created } = await getOrCreateRelationship(user.id, inviter.id);

        if (created) {
          await ctx.reply(T.startConnected(name, getDisplayName(inviter)), {
            parse_mode: 'Markdown',
          });

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
          await ctx.reply(T.startAlreadyConnected(name, getDisplayName(inviter)), {
            parse_mode: 'Markdown',
          });
        }

        if (isNew) {
          await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
        } else {
          await ctx.reply('​', { parse_mode: 'Markdown', ...mainMenuKeyboard(T) });
        }
        return;
      }
    }

    const isReturning = !isNew;
    const welcomeText = isReturning ? T.startWelcomeBack(name) : T.startWelcome(name);

    if (isNew) {
      await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
      await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
    } else {
      await ctx.reply(welcomeText, {
        parse_mode: 'Markdown',
        ...mainMenuKeyboard(T),
      });
    }
  } catch (error) {
    const T = useT(language);
    await ctx.reply(T.errSomethingWrong);
    console.error('setLang action error:', error);
  }
}
