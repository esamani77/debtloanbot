import { Markup } from 'telegraf';
import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { findOrCreateUser, findUserById, setUserLanguage, getDisplayName } from '../../services/userService';
import { getOrCreateRelationship } from '../../services/relationshipService';
import { parseInvitePayload } from '../../utils/inviteLink';
import { useT } from '../../i18n';
import { getSessionByToken, getBankAccountsForParticipants, isSessionMember } from '../../services/splitService';
import { findUserByTelegramId } from '../../services/userService';
import { computeNetBalances, simplifyDebts } from '../../utils/debtSimplification';
import { currencySymbol } from '../../utils/currency';
import prisma from '../../db/prisma';

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
        const sym = currencySymbol(result.currency, language);
        const viewer = await findUserByTelegramId(telegramId);
        const alreadyMember = viewer ? isSessionMember(result, viewer.id) : false;
        const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';
        const miniAppUrl = `https://t.me/${BOT_USERNAME}/app`;
        const joinButton = alreadyMember
          ? Markup.button.url(T.splitJoinOpenBtn, miniAppUrl)
          : Markup.button.callback(T.splitJoinBtn, `split_join:${result.id}`);
        await ctx.reply(
          T.splitSharedSummary(result.name ?? null, result.currency, result.createdAt, result.participants, netBalances, transfers, sym, bankAccounts, result.bills.map((b) => ({ name: b.name, totalAmount: b.totalAmount, paidBy: result.participants[b.paidByIndex] }))),
          { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[joinButton]]) },
        );
      }
      if (!isNew) await ctx.reply('​', { parse_mode: 'Markdown', ...mainMenuKeyboard(T) });
      else await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
      return;
    }

    let pendingInvite = ctx.session.pendingInvite;
    ctx.session.pendingInvite = undefined;

    // Fallback: if session was lost (e.g. bot restarted), recover from DB
    if (!pendingInvite) {
      const dbRecord = await prisma.pendingInvite.findUnique({ where: { telegramId } });
      if (dbRecord) pendingInvite = dbRecord.payload;
    }
    // Always clean up the DB record once we've read it
    await prisma.pendingInvite.deleteMany({ where: { telegramId } });

    if (pendingInvite && pendingInvite.startsWith('splitjoin_')) {
      const token = pendingInvite.slice('splitjoin_'.length);
      const invite = await prisma.splitParticipantInvite.findUnique({
        where: { token },
        include: { splitSession: { include: { bills: { orderBy: { createdAt: 'asc' } } } } },
      });

      if (!invite || invite.claimedByUserId) {
        await ctx.reply(T.startInviteInvalid(name), { parse_mode: 'Markdown' });
      } else {
        // Claim the participant slot
        const idx = invite.participantIndex;
        const updatedIds = [...invite.splitSession.participantTelegramIds];
        updatedIds[idx] = telegramId;
        await prisma.splitSession.update({
          where: { id: invite.splitSessionId },
          data: { participantTelegramIds: updatedIds },
        });
        await prisma.splitParticipantInvite.update({
          where: { token },
          data: { claimedByUserId: user.id, claimedAt: new Date() },
        });

        // Show personalized split summary
        const session = invite.splitSession;
        const BOT_USERNAME = process.env.BOT_USERNAME ?? 'debtloanbot';
        const netBalances = computeNetBalances(session.participants, session.bills);
        const transfers = simplifyDebts(session.participants, netBalances, session.currency);
        const myName = session.participants[idx];
        const myBalance = netBalances[idx];
        const myTransfers = transfers.filter((t) => t.from === myName || t.to === myName);
        const sym = currencySymbol(session.currency as any, language);
        const shareLink = session.shareToken
          ? `https://t.me/${BOT_USERNAME}?start=split_${session.shareToken}`
          : '';
        const creator = await findUserById(session.createdById);
        await ctx.reply(
          T.splitNotifyResultsReady(
            creator?.nickname ?? creator?.name ?? 'Creator',
            session.name ?? null,
            sym,
            myBalance,
            myTransfers,
            shareLink,
          ),
          { parse_mode: 'Markdown' },
        );

        // Notify creator
        if (creator) {
          const creatorT = useT(creator.language);
          ctx.telegram
            .sendMessage(creator.telegramId, creatorT.splitParticipantJoined(name, session.name ?? ''), {
              parse_mode: 'Markdown',
            })
            .catch(() => {});
        }
      }

      if (isNew) {
        await ctx.scene.enter('NICKNAME_SETUP', { telegramName: name, mode: 'onboarding' });
      } else {
        await ctx.reply('​', { parse_mode: 'Markdown', ...mainMenuKeyboard(T) });
      }
      return;
    }

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
