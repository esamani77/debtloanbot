import { Markup } from 'telegraf';
import { BotContext } from '../../models/types';

export async function helpHandler(ctx: BotContext): Promise<void> {
  await ctx.reply(
    `❓ *DebtMate — Help*\n\n` +
      `*Commands:*\n` +
      `/start — Register and see the welcome message\n` +
      `/invite — Generate your personal invite link\n` +
      `/contacts — View all your contacts and balances\n` +
      `/balance — Check balance with your active contact\n` +
      `/add — Add a new debt or loan transaction\n` +
      `/logs — View recent transactions with active contact\n` +
      `/help — Show this help message\n\n` +
      `*How it works:*\n` +
      `1. Use /invite to get your personal link\n` +
      `2. Share the link with a friend\n` +
      `3. Once connected, select them via /contacts\n` +
      `4. Use /add to record debts and loans\n` +
      `5. Use /balance to see who owes what\n\n` +
      `*Balance Explained:*\n` +
      `💰 *Loan* — You lent money (they owe you)\n` +
      `💸 *Debt* — You borrowed money (you owe them)`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('📨 Get Invite Link', 'get_invite_link'),
          Markup.button.callback('📋 View Contacts', 'go_contacts'),
        ],
        [Markup.button.callback('➕ Add Transaction', 'add_transaction')],
      ]),
    }
  );
}
