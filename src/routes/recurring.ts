import { Router } from "express";
import { listRecurring, createRecurring, deleteRecurring } from "../controllers/recurringController";

const router = Router();

router.get("/", listRecurring);
router.post("/", createRecurring);
router.delete("/:id", deleteRecurring);

export default router;
