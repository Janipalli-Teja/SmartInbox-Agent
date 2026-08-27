import { google } from "googleapis";
import { pool } from "./src/config/db.js";
import { processEmail } from "./src/services/emailService.js";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const userId = 1;
  const [rows] = await pool.query(
    "SELECT access_token, refresh_token, token_expiry FROM users WHERE id = ?",
    [userId]
  );

  if (rows.length === 0) {
    console.error("User not found");
    process.exit(1);
  }
  const user = rows[0];

  const userOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  userOauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: Number(user.token_expiry),
  });

  const gmail = google.gmail({ version: "v1", auth: userOauth2Client });

  console.log("Fetching messages from Gmail...");
  const response = await gmail.users.messages.list({
    userId: "me",
    maxResults: 50,
  });

  const messages = response.data.messages || [];
  console.log(`Fetched ${messages.length} messages. Fetching details...`);

  for (const msg of messages) {
    try {
      const emailRes = await gmail.users.messages.get({
        userId: "me",
        id: msg.id,
        format: "full",
      });

      const headers = emailRes.data.payload?.headers ?? [];
      const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
      const from = headers.find((h) => h.name === "From")?.value ?? "";
      const dateHeader = headers.find((h) => h.name === "Date")?.value ?? "";
      const internalDateMs = Number(emailRes.data.internalDate ?? 0);
      const internalDate = new Date(internalDateMs).toISOString();

      const senderDomain = from.match(/@([a-zA-Z0-9.-]+)/)?.[1] ?? "";
      const snippet = emailRes.data.snippet ?? "";

      const processed = processEmail(subject, from, snippet, senderDomain);
      const { classification, confidence } = processed.classificationResult;

      console.log(`ID: ${msg.id}`);
      console.log(`Date (internal): ${internalDate} | Date (header): ${dateHeader}`);
      console.log(`From: ${from}`);
      console.log(`Subject: ${subject}`);
      console.log(`Snippet: ${snippet}`);
      console.log(`Classification: ${classification} (conf: ${confidence})`);
      console.log("-".repeat(50));
    } catch (e) {
      console.error(`Error fetching message ${msg.id}:`, e.message);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  pool.end();
});
