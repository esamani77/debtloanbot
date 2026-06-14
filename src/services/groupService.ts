import { GroupMemberStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import prisma from '../db/prisma';
import { getOrCreateRelationship } from './relationshipService';
import { findUserById, getDisplayName } from './userService';
import { sendMail } from './mailService';
import { sendOtpSms } from './smsService';

const WEB_URL = process.env.WEB_URL ?? 'https://debtmate.ir';

export interface NewMemberInput {
  type: 'self' | 'contact' | 'email' | 'phone' | 'name';
  name: string;
  userId?: string;   // for 'self' and 'contact'
  email?: string;    // for 'email'
  phone?: string;    // for 'phone'
}

function groupInviteHtml(inviterName: string, groupName: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>You've been invited to a group on DebtMate</title>
</head>
<body style="margin:0;padding:0;background:#0d1412;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" role="presentation" style="max-width:480px;width:100%;background:#141f1b;border:1px solid #243028;border-radius:20px;overflow:hidden">
        <tr><td height="4" style="background:#e07855;font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td align="center" style="padding:36px 40px 0">
          <table cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="background:#e07855;border-radius:9px;width:38px;height:38px;text-align:center;vertical-align:middle">
                <span style="font-size:19px;font-weight:800;color:#ffffff;line-height:38px;display:block">D</span>
              </td>
              <td style="padding-left:9px;vertical-align:middle">
                <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Debt</span><span style="font-size:20px;font-weight:700;color:#e07855;letter-spacing:-0.3px">Mate</span>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding:28px 40px 10px">
          <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.4px">${inviterName} invited you to "${groupName}"</h1>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 28px">
          <p style="margin:0;font-size:14px;color:#7a9e90;line-height:1.65">
            Join the group to track expenses and splits together with <strong style="color:#c8dfd5">${inviterName}</strong>.
          </p>
        </td></tr>
        <tr><td align="center" style="padding:0 40px 34px">
          <a href="${inviteLink}" style="display:inline-block;background:#e07855;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;letter-spacing:0.1px">Join Group</a>
        </td></tr>
        <tr><td style="padding:0 40px">
          <div style="height:1px;background:#1e2d28;font-size:0;line-height:0">&nbsp;</div>
        </td></tr>
        <tr><td align="center" style="padding:24px 40px 32px">
          <p style="margin:0;font-size:12px;color:#3a5448;line-height:1.7">
            You received this because ${inviterName} invited you to a group on DebtMate.<br>
            &copy; ${new Date().getFullYear()} DebtMate &middot; <a href="https://debtmate.ir" style="color:#4d7060;text-decoration:none">debtmate.ir</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendGroupInvite(
  inviterName: string,
  groupName: string,
  token: string,
  email?: string,
  phone?: string,
): Promise<void> {
  const link = `${WEB_URL}/en/groups/invite/${token}`;
  if (email) {
    await sendMail({
      to: email,
      subject: `${inviterName} invited you to "${groupName}" on DebtMate`,
      text: `${inviterName} invited you to the group "${groupName}" on DebtMate. Join here: ${link}`,
      html: groupInviteHtml(inviterName, groupName, link),
    }).catch((err) => console.error('[groupService] email invite failed:', err));
  }
  if (phone) {
    await sendOtpSms(phone, link)
      .catch((err) => console.error('[groupService] sms invite failed:', err));
  }
}

export async function createGroup(
  creatorId: string,
  name: string,
  members: NewMemberInput[],
) {
  const creator = await findUserById(creatorId);
  if (!creator) throw new Error('User not found');
  const creatorName = getDisplayName(creator);

  const group = await prisma.group.create({
    data: {
      name,
      createdById: creatorId,
      members: {
        create: members.map((m) => {
          const isPending = m.type === 'email' || m.type === 'phone';
          const token = isPending ? randomUUID() : undefined;
          return {
            name: m.name,
            userId: m.userId ?? (m.type === 'self' ? creatorId : undefined),
            email: m.email,
            phone: m.phone,
            inviteToken: token,
            invitedAt: isPending ? new Date() : undefined,
            joinedAt: !isPending ? new Date() : undefined,
            status: isPending
              ? GroupMemberStatus.PENDING
              : m.type === 'name'
              ? GroupMemberStatus.NAME_ONLY
              : GroupMemberStatus.ACTIVE,
          };
        }),
      },
    },
    include: { members: true },
  });

  // Send invites for PENDING members
  for (const member of group.members) {
    if (member.status === GroupMemberStatus.PENDING && member.inviteToken) {
      await sendGroupInvite(creatorName, name, member.inviteToken, member.email ?? undefined, member.phone ?? undefined);
    }
  }

  return group;
}

export async function getGroupsForUser(userId: string) {
  return prisma.group.findMany({
    where: {
      OR: [
        { createdById: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      _count: { select: { splits: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getGroupById(groupId: string, requesterId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: { createdAt: 'asc' } },
      splits: {
        select: { id: true, name: true, status: true, currency: true, createdAt: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      },
    },
  });

  if (!group) return null;

  const isMember =
    group.createdById === requesterId ||
    group.members.some((m) => m.userId === requesterId);
  if (!isMember) return null;

  return group;
}

export async function updateGroupName(groupId: string, requesterId: string, name: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error('Group not found');
  if (group.createdById !== requesterId) throw new Error('Not authorized');
  return prisma.group.update({ where: { id: groupId }, data: { name } });
}

export async function deleteGroup(groupId: string, requesterId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error('Group not found');
  if (group.createdById !== requesterId) throw new Error('Not authorized');
  await prisma.group.delete({ where: { id: groupId } });
}

export async function addGroupMember(groupId: string, requesterId: string, member: NewMemberInput) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { select: { userId: true } } },
  });
  if (!group) throw new Error('Group not found');

  const isMember =
    group.createdById === requesterId ||
    group.members.some((m) => m.userId === requesterId);
  if (!isMember) throw new Error('Not authorized');

  const creator = await findUserById(group.createdById);
  const creatorName = creator ? getDisplayName(creator) : 'Someone';

  const isPending = member.type === 'email' || member.type === 'phone';
  const token = isPending ? randomUUID() : undefined;

  const newMember = await prisma.groupMember.create({
    data: {
      groupId,
      name: member.name,
      userId: member.userId ?? (member.type === 'self' ? requesterId : undefined),
      email: member.email,
      phone: member.phone,
      inviteToken: token,
      invitedAt: isPending ? new Date() : undefined,
      joinedAt: !isPending ? new Date() : undefined,
      status: isPending
        ? GroupMemberStatus.PENDING
        : member.type === 'name'
        ? GroupMemberStatus.NAME_ONLY
        : GroupMemberStatus.ACTIVE,
    },
  });

  if (newMember.status === GroupMemberStatus.PENDING && token) {
    await sendGroupInvite(creatorName, group.name, token, member.email, member.phone);
  }

  return newMember;
}

export async function removeGroupMember(groupId: string, requesterId: string, memberId: string) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new Error('Group not found');

  const memberRecord = await prisma.groupMember.findFirst({ where: { id: memberId, groupId } });
  if (!memberRecord) throw new Error('Member not found');

  const isCreator = group.createdById === requesterId;
  const isSelf = memberRecord.userId === requesterId;
  if (!isCreator && !isSelf) throw new Error('Not authorized');

  await prisma.groupMember.delete({ where: { id: memberId } });
}

export async function resendGroupInvite(groupId: string, requesterId: string, memberId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: { select: { userId: true } } },
  });
  if (!group) throw new Error('Group not found');

  const isMember =
    group.createdById === requesterId ||
    group.members.some((m) => m.userId === requesterId);
  if (!isMember) throw new Error('Not authorized');

  const memberRecord = await prisma.groupMember.findFirst({ where: { id: memberId, groupId } });
  if (!memberRecord) throw new Error('Member not found');
  if (memberRecord.status !== GroupMemberStatus.PENDING) throw new Error('Member is not pending');

  const newToken = randomUUID();
  await prisma.groupMember.update({
    where: { id: memberId },
    data: { inviteToken: newToken, invitedAt: new Date() },
  });

  const creator = await findUserById(group.createdById);
  const creatorName = creator ? getDisplayName(creator) : 'Someone';
  await sendGroupInvite(creatorName, group.name, newToken, memberRecord.email ?? undefined, memberRecord.phone ?? undefined);
}

export async function getGroupInviteInfo(token: string) {
  const member = await prisma.groupMember.findUnique({
    where: { inviteToken: token },
    include: { group: { include: { createdBy: true } } },
  });
  if (!member) return null;
  return {
    groupId: member.groupId,
    groupName: member.group.name,
    inviterName: getDisplayName(member.group.createdBy),
    memberName: member.name,
  };
}

export async function acceptGroupInvite(token: string, accepterId: string) {
  const member = await prisma.groupMember.findUnique({
    where: { inviteToken: token },
    include: { group: true },
  });
  if (!member) throw new Error('Invite not found');
  if (member.status !== GroupMemberStatus.PENDING) throw new Error('Invite already used');
  if (member.userId === accepterId) throw new Error('Already a member');

  await prisma.groupMember.update({
    where: { id: member.id },
    data: {
      userId: accepterId,
      status: GroupMemberStatus.ACTIVE,
      joinedAt: new Date(),
      inviteToken: null,
    },
  });

  // Establish contact relationship between creator and accepter
  await getOrCreateRelationship(member.group.createdById, accepterId);

  return { groupId: member.groupId, groupName: member.group.name };
}
