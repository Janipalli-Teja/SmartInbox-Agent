import type { Request, Response } from "express";
import { oauth2Client, SCOPES } from "../config/google.js";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import type { RowDataPacket } from "mysql2";

export const googleLogin = (
  req: Request,
  res: Response
) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent"
  });

  res.redirect(url);
};

export const googleCallback = async (
  req: Request,
  res: Response
) => {
  try {
    const code = req.query.code as string;

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userinfo = await oauth2.userinfo.get();
    const email = userinfo.data.email;

    if (!email) {
      throw new Error("No email found from Google");
    }

    // Upsert user to the database
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    let userId: number;

    if (rows.length === 0) {
      const [insertResult] = await pool.query<any>(
        "INSERT INTO users (email, access_token, refresh_token, token_expiry) VALUES (?, ?, ?, ?)",
        [email, tokens.access_token, tokens.refresh_token, tokens.expiry_date]
      );
      userId = insertResult.insertId;
    } else {
      userId = rows[0]!.id;
      // We only update refresh_token if it's provided (Google doesn't always send it unless prompt=consent)
      if (tokens.refresh_token) {
        await pool.query(
          "UPDATE users SET access_token = ?, refresh_token = ?, token_expiry = ? WHERE id = ?",
          [tokens.access_token, tokens.refresh_token, tokens.expiry_date, userId]
        );
      } else {
        await pool.query(
          "UPDATE users SET access_token = ?, token_expiry = ? WHERE id = ?",
          [tokens.access_token, tokens.expiry_date, userId]
        );
      }
    }

    // Generate JWT token
    const jwtToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    // Set secure HttpOnly cookie
    res.cookie("smartinbox_auth", jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.redirect("http://localhost:5173/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).send("Auth failed");
  }
};