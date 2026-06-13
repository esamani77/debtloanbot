import crypto from "crypto";
import prisma from "../db/prisma";

const MAX_ATTEMPTS = 10;

export async function generateUniqueWebInviteToken(): Promise<string> {
  let attempts = 0;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const token = crypto.randomBytes(6).toString("base64url").slice(0, 8);
    const exists = await prisma.webContactInvite.findUnique({
      where: { token },
    });
    if (!exists) return token;
  }
  attempts++;
  if (attempts >= MAX_ATTEMPTS) {
    throw new Error("Failed to generate unique invite token after 10 attempts");
  }
  // if we get here, re-generate the token
  return generateUniqueWebInviteToken();
}
