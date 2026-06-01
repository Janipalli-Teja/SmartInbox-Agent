import type { Request, Response } from "express";
import { oauth2Client, SCOPES } from "../config/google.js";

export const googleLogin = (
  req: Request,
  res: Response
) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  res.redirect(url);
};

export const googleCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const code = req.query.code as string;

    const { tokens } =
      await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    res.send("Authentication successful");
  } catch (error) {
    console.error(error);

    res.status(500).send("Auth failed");
  }
};