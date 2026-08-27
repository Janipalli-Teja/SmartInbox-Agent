import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware.js";
import { getSavedEmails, resetLastSyncTimestamp } from "../services/databaseService.js";
import { syncEmails } from "../services/gmailService.js";

export const getEmails = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;
    const emails = await getSavedEmails(userId);

    res.json(emails);
  } catch (error) {
    console.error("Failed to fetch emails from DB:", error);
    res.status(500).json({ error: "Failed to fetch emails" });
  }
};

export const triggerSync = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;
    
    // We don't await the sync process so the response is immediate
    syncEmails(userId).catch(error => {
      console.error("Background sync failed:", error);
    });

    res.json({ message: "Sync started in the background" });
  } catch (error) {
    console.error("Failed to start sync:", error);
    res.status(500).json({ error: "Failed to start sync" });
  }
};

export const resetSync = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    const userId = req.userId!;
    await resetLastSyncTimestamp(userId);
    res.json({ message: "Sync timestamp reset successfully. Next sync will fetch all emails." });
  } catch (error) {
    console.error("Failed to reset sync timestamp:", error);
    res.status(500).json({ error: "Failed to reset sync timestamp" });
  }
};