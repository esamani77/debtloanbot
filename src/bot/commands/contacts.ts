import { Markup } from "telegraf";
import { Language } from "@prisma/client";
import { BotContext } from "../../models/types";
import { findOrCreateUser } from "../../services/userService";
import { getUserRelationships } from "../../services/relationshipService";
import { currencySymbol } from "../../utils/currency";
import { useT } from "../../i18n";

export async function contactsHandler(ctx: BotContext): Promise<void> {
  if (!ctx.from) {
    await ctx.reply("Could not identify user. Please try again.");
    return;
  }

  const T = useT(ctx.session.userLanguage ?? Language.EN);
  const telegramId = String(ctx.from.id);
  const name =
    ctx.from.first_name + (ctx.from.last_name ? ` ${ctx.from.last_name}` : "");

  try {
    const user = await findOrCreateUser(telegramId, name);
    const relationships = await getUserRelationships(user.id);

    if (relationships.length === 0) {
      await ctx.reply(`${T.contactsTitle}\n\n${T.contactsEmpty}`, {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard([
          [
            {
              ...Markup.button.callback(T.btnInviteFriend, "get_invite_link"),
              style: "primary",
            } as any,
          ],
        ]),
      });
      return;
    }

    const contactList = relationships
      .map(({ contact, netBalance, relationship }, i) => {
        const sym = currencySymbol(relationship.currency, ctx.session.userLanguage);
        let balanceLabel: string;
        if (netBalance === 0) balanceLabel = T.contactsBalanceSettled;
        else if (netBalance > 0)
          balanceLabel = T.contactsBalanceOwed(
            sym,
            Math.abs(netBalance).toFixed(2),
          );
        else
          balanceLabel = T.contactsBalanceOwes(
            sym,
            Math.abs(netBalance).toFixed(2),
          );
        return `${i + 1}. *${contact.name}* — ${balanceLabel}`;
      })
      .join("\n");

    const contactButtons = relationships.map(({ contact }) => [
      Markup.button.callback(
        `👤 ${contact.name}`,
        `select_contact:${contact.id}`,
      ),
    ]);
    contactButtons.push([
      Markup.button.callback(T.btnInviteFriend, "get_invite_link"),
    ]);

    await ctx.reply(
      `${T.contactsTitle}\n\n${contactList}\n\n${T.contactsSelectPrompt}`,
      {
        parse_mode: "Markdown",
        ...Markup.inlineKeyboard(contactButtons),
      },
    );
  } catch (error) {
    await ctx.reply(T.errSomethingWrong);
    console.error("contacts handler error:", error);
  }
}
