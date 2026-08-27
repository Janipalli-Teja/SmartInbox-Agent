import express from "express";
import { getEmails, triggerSync, resetSync } from "../controllers/emailController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/emails", requireAuth, getEmails);
router.post("/emails/sync", requireAuth, triggerSync);
router.post("/emails/sync/reset", requireAuth, resetSync);

export default router;