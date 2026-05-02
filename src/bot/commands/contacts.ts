import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';
import { findOrCreateUser } from '../../services/userService';
import { getUserRelationships } from '../../services/relationshipService';
import { currencySymbol } from '../../utils/currency';

function formatBalanceLabel(netBalance: number, symbol: string): string {
  if (netBalance === 0) return '✅ Settled';
  if (netBalance > 0) return `🟢 Owed ${symbol}${Math.abs(netBalance).toFixed(2)}`;
  return `🔴 Owes ${symbol}${Math.abs(netBalance).toFixed(2)}`;
}

export async function contactsHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply('Could not identify user. Please try again.');
    return;
  }

  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : '');

  try {
    const user = await findOrCreateUser(telegramId, name);
    const relationships = await getUserRelationships(user.id);

    if (relationships.length === 0) {
      await ctx.reply(
        '👥 *Your Contacts*\n\nNo contacts yet. Use /invite to connect with someone.',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('📨 Get Invite Link', 'get_invite_link')],
          ]),
        }
      );
      return;
    }

    const contactList = relationships
      .map(({ contact, netBalance, relationship }, i) => {
        const symbol = currencySymbol(relationship.currency);
        const balanceLabel = formatBalanceLabel(netBalance, symbol);
        return `${i + 1}. *${contact.name}* — ${balanceLabel}`;
      })
      .join('\n');

    const contactButtons = relationships.map(({ contact }) => [
      Markup.button.callback(
        `👤 ${contact.name}`,
        `select_contact:${contact.id}`
      ),
    ]);

    contactButtons.push([Markup.button.callback('📨 Invite a Friend', 'get_invite_link')]);

    await ctx.reply(
      `👥 *Your Contacts*\n\n${contactList}\n\nSelect a contact to view details:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(contactButtons),
      }
    );
  } catch (error) {
    await ctx.reply('Something went wrong. Please try again.');
    console.error('contacts handler error:', error);
  }
}
