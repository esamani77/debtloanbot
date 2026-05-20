import { Language } from '@prisma/client';
import { BotContext } from '../../models/types';
import { useT } from '../../i18n';
import { findUserByTelegramId } from '../../services/userService';
import { listUserSessions } from '../../services/splitService';

export async function splitsHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) return;
  const t = useT(ctx.session.userLanguage ?? Language.EN);

  const viewer = await findUserByTelegramId(String(ctx.from.id));
  if (!viewer) {
    await ctx.reply(t.errUserNotFound);
    return;
  }

  const sessions = await listUserSessions(viewer.id, 10);
  const formatted = sessions.map((s) => ({
    name: s.name,
    status: s.status,
    billCount: s.bills.length,
    createdAt: s.createdAt,
  }));

  await ctx.reply(t.splitsList(formatted), { parse_mode: 'Markdown' });
}
