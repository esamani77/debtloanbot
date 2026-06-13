import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getOrCreateMyInvite,
  sendInviteByContact,
  getInviteInfo,
  acceptInvite,
} from "../controllers/contactInviteController";

const router = Router();

// GET /my must be registered before /:token or Express matches "my" as a token
router.get("/my", requireAuth, getOrCreateMyInvite);
router.post("/send", requireAuth, sendInviteByContact);
router.get("/:token", getInviteInfo);
router.post("/:token/accept", requireAuth, acceptInvite);

export default router;
