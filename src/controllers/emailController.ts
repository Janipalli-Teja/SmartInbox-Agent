import type { Request, Response } from "express";
import { fetchEmails } from "../services/gmailService.js";

export const getEmails = async (
  req: Request,
  res: Response
) => {
  try {
    const emails = await fetchEmails();

    res.json(emails);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch emails",
    });
  }
};