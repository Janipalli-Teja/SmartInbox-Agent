import { pool } from "../config/db.js";
import type { RowDataPacket } from "mysql2";

export interface EmailRow {
  id: string;
  user_id: number;
  subject: string;
  from_address: string;
  sender_domain: string;
  snippet: string;
  body: string | null;
  received_at: string | null;
  classification: string;
  confidence: number;
  initial_confidence: number | null;
  llm_verified: number;
  reason: string | null;
  matched_keywords: string | string[];
}

export const getSavedEmails = async (userId: number): Promise<EmailRow[]> => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT
       e.id,
       e.user_id,
       e.subject,
       e.from_address,
       e.sender_domain,
       e.snippet,
       e.body,
       e.received_at,
       c.classification,
       c.confidence,
       c.initial_confidence,
       c.llm_verified,
       c.reason,
       c.matched_keywords
     FROM emails e
     JOIN email_classifications c
       ON e.id = c.email_id AND e.user_id = c.user_id
     WHERE e.user_id = ?
     ORDER BY e.received_at DESC
     LIMIT 200`,
    [userId]
  );

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    subject: row.subject ?? "",
    from_address: row.from_address ?? "",
    sender_domain: row.sender_domain ?? "",
    snippet: row.snippet ?? "",
    body: row.body ?? null,
    received_at: row.received_at
      ? new Date(row.received_at).toISOString()
      : null,
    classification: row.classification,
    confidence: row.confidence,
    initial_confidence: row.initial_confidence ?? null,
    llm_verified: Number(row.llm_verified),
    reason: row.reason ?? null,
    matched_keywords:
      row.matched_keywords
        ? typeof row.matched_keywords === "string"
          ? JSON.parse(row.matched_keywords)
          : row.matched_keywords
        : [],
  }));
};

export const resetLastSyncTimestamp = async (userId: number): Promise<void> => {
  await pool.query(
    "UPDATE users SET last_sync_timestamp = NULL WHERE id = ?",
    [userId]
  );
};
