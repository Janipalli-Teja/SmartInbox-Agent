import { google } from "googleapis";
import { processEmail } from "./emailService.js";
import { classifyEmailsWithGemini } from "./geminiService.js";
import type { EmailMetadata } from "../types.js";
import { pool } from "../config/db.js";
import type { RowDataPacket } from "mysql2";

const GMAIL_PAGE_SIZE = 50;
const DETAIL_BATCH_SIZE = 10;
const LLM_BATCH_SIZE = 10;

/** Decode base64url-encoded Gmail message parts to plain text */
function decodeBody(data: string): string {
  try {
    return Buffer.from(data, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

/** Recursively extract text/plain body from Gmail message payload */
function extractBody(payload: any): string {
  if (!payload) return "";

  // Direct body on this part
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  // Recurse into multipart
  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const result = extractBody(part);
      if (result) return result;
    }
  }

  // Fallback: any body data present
  if (payload.body?.data) {
    return decodeBody(payload.body.data);
  }

  return "";
}

export const syncEmails = async (userId: number): Promise<{ syncedCount: number }> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT access_token, refresh_token, token_expiry, last_sync_timestamp FROM users WHERE id = ?",
    [userId]
  );

  if (rows.length === 0) throw new Error("User not found");
  const user = rows[0]!;
  if (!user.access_token) throw new Error("User has not authenticated with Google");

  const userOauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  userOauth2Client.setCredentials({
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    expiry_date: user.token_expiry,
  });

  const gmail = google.gmail({ version: "v1", auth: userOauth2Client });

  // Use stored timestamp to only fetch emails NEWER than last sync
  const lastSyncTimestamp: number | null = user.last_sync_timestamp ?? null;
  const queryParams = lastSyncTimestamp ? `after:${lastSyncTimestamp}` : undefined;

  console.log(
    lastSyncTimestamp
      ? `Starting sync for user ${userId} — fetching emails after timestamp ${lastSyncTimestamp}`
      : `Starting sync for user ${userId} — no previous sync, fetching all emails`
  );

  let nextPageToken: string | undefined;
  let totalSynced = 0;
  let newestEmailTimestamp: number = lastSyncTimestamp ?? 0;

  // In-run deduplication
  const processedIds = new Set<string>();

  try {
    do {
      console.log(`Fetching page... (nextPageToken: ${nextPageToken ?? "none"})`);

      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: GMAIL_PAGE_SIZE,
        ...(queryParams && { q: queryParams }),
        ...(nextPageToken && { pageToken: nextPageToken }),
      });

      const messages = response.data.messages ?? [];
      nextPageToken = response.data.nextPageToken ?? undefined;

      console.log(`Gmail API returned ${messages.length} messages.`);

      if (messages.length === 0) {
        console.log("No messages in this batch, skipping...");
        continue;
      }

      console.log(`Processing batch of ${messages.length} messages...`);

      const finalEmails: EmailMetadata[] = [];
      const llmVerificationEmails: EmailMetadata[] = [];

      // Fetch FULL details for each message (for body + internalDate)
      for (let i = 0; i < messages.length; i += DETAIL_BATCH_SIZE) {
        const batch = messages.slice(i, i + DETAIL_BATCH_SIZE);
        await Promise.all(
          batch.map(async (msg) => {
            if (!msg.id || processedIds.has(msg.id)) return;
            processedIds.add(msg.id);
            try {
              const emailRes = await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "full", // full format to get body
              });

              // Track newest email for last_sync_timestamp update
              const internalDateMs = Number(emailRes.data.internalDate ?? 0);
              const internalDateSec = Math.floor(internalDateMs / 1000);
              if (internalDateSec > newestEmailTimestamp) {
                newestEmailTimestamp = internalDateSec;
              }

              const headers = emailRes.data.payload?.headers ?? [];
              const subject = headers.find((h) => h.name === "Subject")?.value ?? "";
              const from = headers.find((h) => h.name === "From")?.value ?? "";
              const dateHeader = headers.find((h) => h.name === "Date")?.value ?? "";
              const senderDomain = from.match(/@([a-zA-Z0-9.-]+)/)?.[1] ?? "";
              const snippet = emailRes.data.snippet ?? "";

              // Extract full body from message payload
              const body = extractBody(emailRes.data.payload);

              // Parse received_at from Date header or fall back to internalDate
              let receivedAt: string;
              if (dateHeader) {
                const parsed = new Date(dateHeader);
                receivedAt = isNaN(parsed.getTime())
                  ? new Date(internalDateMs).toISOString()
                  : parsed.toISOString();
              } else {
                receivedAt = new Date(internalDateMs).toISOString();
              }

              // Classify using subject + snippet (body too long for keyword scan)
              const processed = processEmail(subject, from, snippet, senderDomain);
              const { classification, confidence } = processed.classificationResult;

              if (confidence === 0) return;

              const emailData: EmailMetadata = {
                id: msg.id,
                subject,
                from,
                snippet,
                body,
                receivedAt,
                senderDomain: processed.senderDomain,
                ClassificationResult: {
                  ...processed.classificationResult,
                  initialConfidence: confidence,
                },
              };

              // confidence === 100 → STRONG match, save directly
              // confidence < 100 → send to LLM for verification
              if (confidence === 100) {
                finalEmails.push(emailData);
              } else {
                llmVerificationEmails.push(emailData);
              }
            } catch (error) {
              console.error(`Error processing message ${msg.id}`, error);
            }
          })
        );
      }

      // LLM verification for non-100-confidence emails
      for (let i = 0; i < llmVerificationEmails.length; i += LLM_BATCH_SIZE) {
        const chunk = llmVerificationEmails.slice(i, i + LLM_BATCH_SIZE);
        try {
          const verifiedEmails = await classifyEmailsWithGemini(chunk, [
            "application_shortlisted",
            "application_rejected",
            "assessment",
            "interview"
          ]);
          finalEmails.push(...verifiedEmails);
        } catch (error) {
          console.error("Gemini verification failed for chunk:", error);
          // FALLBACK: push the chunk with their initial unverified classification
          for (const email of chunk) {
             finalEmails.push({
               ...email,
               ClassificationResult: {
                 ...email.ClassificationResult,
                 llmVerified: false
               }
             });
          }
        }
        // Sleep slightly to avoid hitting Gemini free tier rate limits
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      // Persist batch — INSERT IGNORE + unique key prevents duplicates
      if (finalEmails.length > 0) {
        for (const email of finalEmails) {
          try {
            await pool.query(
              `INSERT IGNORE INTO emails
                (id, user_id, subject, from_address, sender_domain, snippet, body, received_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                email.id,
                userId,
                email.subject ?? null,
                email.from ?? null,
                email.senderDomain ?? null,
                email.snippet ?? null,
                email.body ?? null,
                email.receivedAt ? new Date(email.receivedAt) : null,
              ]
            );

            await pool.query(
              `INSERT IGNORE INTO email_classifications
                (email_id, user_id, classification, confidence, initial_confidence, llm_verified, reason, matched_keywords)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                email.id,
                userId,
                email.ClassificationResult.classification,
                email.ClassificationResult.confidence,
                email.ClassificationResult.initialConfidence ?? null,
                email.ClassificationResult.llmVerified ?? false,
                email.ClassificationResult.reason ?? null,
                JSON.stringify(email.ClassificationResult.matchedKeywords ?? []),
              ]
            );
          } catch (dbError) {
            console.error(`Failed to save email ${email.id} to DB`, dbError);
          }
        }
        totalSynced += finalEmails.length;
        console.log(`Saved batch of ${finalEmails.length} emails to database.`);
      }

    } while (nextPageToken);

    // Save the newest email's timestamp so the next sync only fetches newer emails
    if (newestEmailTimestamp > 0) {
      await pool.query(
        "UPDATE users SET last_sync_timestamp = ? WHERE id = ?",
        [newestEmailTimestamp, userId]
      );
      console.log(`Updated last_sync_timestamp to ${newestEmailTimestamp} for user ${userId}`);
    }

    console.log(`Sync complete. Total relevant emails saved: ${totalSynced}`);
    return { syncedCount: totalSynced };

  } catch (error) {
    console.error("Error syncing emails:", error);
    throw error;
  }
};