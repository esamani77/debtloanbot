/** Generates a Telegram deep-link invite URL for the given user ID */
export function generateInviteLink(userId: string): string {
  const botUsername = process.env.BOT_USERNAME;
  return `https://t.me/${botUsername}?start=invite_${userId}`;
}

/** Parses a /start payload and returns the inviting user's ID if valid */
export function parseInvitePayload(payload: string): string | null {
  if (payload.startsWith('invite_')) {
    return payload.slice('invite_'.length);
  }
  return null;
}
