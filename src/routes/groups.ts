import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  listGroups,
  createGroupHandler,
  getGroup,
  updateGroup,
  deleteGroupHandler,
  addMember,
  removeMember,
  resendInvite,
  getGroupInvite,
  acceptGroupInviteHandler,
} from '../controllers/groupController';

const router = Router();

// Public: invite info — must be before /:id routes to avoid conflict
router.get('/invite/:token', getGroupInvite);
router.post('/invite/:token/accept', requireAuth, acceptGroupInviteHandler);

router.get('/', requireAuth, listGroups);
router.post('/', requireAuth, createGroupHandler);
router.get('/:id', requireAuth, getGroup);
router.patch('/:id', requireAuth, updateGroup);
router.delete('/:id', requireAuth, deleteGroupHandler);
router.post('/:id/members', requireAuth, addMember);
router.delete('/:id/members/:memberId', requireAuth, removeMember);
router.post('/:id/members/:memberId/invite', requireAuth, resendInvite);

export default router;
