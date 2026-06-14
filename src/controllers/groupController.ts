import { Request, Response } from 'express';
import {
  createGroup,
  getGroupsForUser,
  getGroupById,
  updateGroupName,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  resendGroupInvite,
  getGroupInviteInfo,
  acceptGroupInvite,
  NewMemberInput,
} from '../services/groupService';

export async function listGroups(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const groups = await getGroupsForUser(userId);
    res.json(groups);
  } catch {
    res.status(500).json({ error: 'Failed to fetch groups.' });
  }
}

export async function createGroupHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const { name, members } = req.body as { name?: string; members?: NewMemberInput[] };

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Group name is required.' });
      return;
    }
    if (!Array.isArray(members) || members.length < 1) {
      res.status(400).json({ error: 'At least one member is required.' });
      return;
    }

    const group = await createGroup(userId, name.trim(), members);
    res.status(201).json(group);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'User not found') { res.status(401).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to create group.' });
  }
}

export async function getGroup(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const group = await getGroupById(String(req.params.id), userId);
    if (!group) { res.status(404).json({ error: 'Group not found.' }); return; }
    res.json(group);
  } catch {
    res.status(500).json({ error: 'Failed to fetch group.' });
  }
}

export async function updateGroup(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const { name } = req.body as { name?: string };
    if (!name || !name.trim()) { res.status(400).json({ error: 'Group name is required.' }); return; }
    const group = await updateGroupName(String(req.params.id), userId, name.trim());
    res.json(group);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Group not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Not authorized') { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to update group.' });
  }
}

export async function deleteGroupHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    await deleteGroup(String(req.params.id), userId);
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Group not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Not authorized') { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to delete group.' });
  }
}

export async function addMember(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const member = req.body as NewMemberInput;
    if (!member.name || !member.name.trim()) { res.status(400).json({ error: 'Member name is required.' }); return; }
    const newMember = await addGroupMember(String(req.params.id), userId, member);
    res.status(201).json(newMember);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Group not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Not authorized') { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to add member.' });
  }
}

export async function removeMember(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    await removeGroupMember(String(req.params.id), userId, String(req.params.memberId));
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Group not found' || msg === 'Member not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Not authorized') { res.status(403).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to remove member.' });
  }
}

export async function resendInvite(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    await resendGroupInvite(String(req.params.id), userId, String(req.params.memberId));
    res.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Group not found' || msg === 'Member not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Not authorized') { res.status(403).json({ error: msg }); return; }
    if (msg === 'Member is not pending') { res.status(400).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to resend invite.' });
  }
}

export async function getGroupInvite(req: Request, res: Response): Promise<void> {
  try {
    const info = await getGroupInviteInfo(String(req.params.token));
    if (!info) { res.status(404).json({ error: 'Invite not found.' }); return; }
    res.json(info);
  } catch {
    res.status(500).json({ error: 'Failed to fetch invite.' });
  }
}

export async function acceptGroupInviteHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = res.locals.userId as string;
    const result = await acceptGroupInvite(String(req.params.token), userId);
    res.json({ ok: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'Invite not found') { res.status(404).json({ error: msg }); return; }
    if (msg === 'Invite already used') { res.status(400).json({ error: msg }); return; }
    if (msg === 'Already a member') { res.status(400).json({ error: msg }); return; }
    res.status(500).json({ error: 'Failed to accept invite.' });
  }
}
