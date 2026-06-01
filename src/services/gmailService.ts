import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";

type EmailMetadata = {
  id: string;
  subject?: string;
  from?: string;
  snippet?: string;
};

const GMAIL_PAGE_SIZE = 500;
const DETAIL_BATCH_SIZE = 20;

export const fetchEmails = async (): Promise<EmailMetadata[]> => {
  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  const messages: { id?: string | null }[] = [];
  let nextPageToken: string | undefined;

  try {
    // Fetch all message IDs
    do {
      const response = await gmail.users.messages.list({
        userId: "me",
        maxResults: GMAIL_PAGE_SIZE,
        ...(nextPageToken && {
          pageToken: nextPageToken,
        }),
      });

      messages.push(...(response.data.messages ?? []));

      nextPageToken = response.data.nextPageToken ?? undefined;
    } while (nextPageToken);

    console.log(`Found ${messages.length} messages`);

    const emailData: EmailMetadata[] = [];

    // Fetch details in batches
    for (
      let i = 0;
      i < messages.length;
      i += DETAIL_BATCH_SIZE
    ) {
      const batch = messages.slice(i, i + DETAIL_BATCH_SIZE);

      const results = await Promise.all(
        batch.map(async (msg) => {
          if (!msg.id) return null;

          try {
            const email = await gmail.users.messages.get({
              userId: "me",
              id: msg.id,
              format: "metadata",
              metadataHeaders: ["Subject", "From"],
            });

            const headers =
              email.data.payload?.headers ?? [];

            const subject = headers.find(
              (h) => h.name === "Subject"
            )?.value;

            const from = headers.find(
              (h) => h.name === "From"
            )?.value;

            return {
              id: msg.id,
              subject: subject ?? undefined,
              from: from ?? undefined,
              snippet: email.data.snippet ?? undefined,
            } as EmailMetadata;
          } catch (error) {
            console.error(
              `Failed to fetch message ${msg.id}`,
              error
            );

            return null;
          }
        })
      );

      emailData.push(
        ...results.filter(
          (email): email is EmailMetadata =>
            email !== null
        )
      );

      console.log(
        `Processed ${Math.min(
          i + DETAIL_BATCH_SIZE,
          messages.length
        )}/${messages.length}`
      );
    }

    return emailData;
  } catch (error) {
    console.error("Failed to fetch emails:", error);
    throw error;
  }
};