import { google } from "googleapis";
import { oauth2Client } from "../config/google.js";
import { processEmail } from "./emailService.js";
import type { EmailMetadata } from "../types.js";

const GMAIL_PAGE_SIZE = 500;
const DETAIL_BATCH_SIZE = 20;

export const fetchEmails = async (): Promise<
  EmailMetadata[]
> => {
  const gmail = google.gmail({
    version: "v1",
    auth: oauth2Client,
  });

  const messages: { id?: string | null }[] = [];
  let nextPageToken: string | undefined;

  try {
    do {
      const response =
        await gmail.users.messages.list({
          userId: "me",
          maxResults: GMAIL_PAGE_SIZE,
          ...(nextPageToken && {
            pageToken: nextPageToken,
          }),
        });

      messages.push(
        ...(response.data.messages ?? [])
      );

      nextPageToken =
        response.data.nextPageToken ??
        undefined;
    } while (nextPageToken);

    console.log(
      `Found ${messages.length} messages`
    );

    const relevantEmails: EmailMetadata[] = [];

    for (
      let i = 0;
      i < messages.length;
      i += DETAIL_BATCH_SIZE
    ) {
      const batch = messages.slice(
        i,
        i + DETAIL_BATCH_SIZE
      );

      const results = await Promise.all(
        batch.map(async (msg): Promise<EmailMetadata | null> => {
          if (!msg.id) return null;

          try {
            const email =
              await gmail.users.messages.get({
                userId: "me",
                id: msg.id,
                format: "metadata",
                metadataHeaders: [
                  "Subject",
                  "From",
                ],
              });

            const headers =
              email.data.payload?.headers ??
              [];

            const subject =
              headers.find(
                (h) =>
                  h.name === "Subject"
              )?.value ?? "";

            const from =
              headers.find(
                (h) => h.name === "From"
              )?.value ?? "";

            const snippet =
              email.data.snippet ?? "";

            const processed =
              processEmail(
                subject,
                from,
                snippet
              );

            const { classification, confidence } =
              processed.classificationResult;

            if (classification === "other") {
              return null;
            }

            if (confidence < 50) {
              return null;
            }
            if (
              classification !== "application_submitted" &&
              classification !== "assessment" &&
              classification !== "interview"
            ) {
              return null;
            }

            return {
              id: msg.id,
              subject,
              from,
              snippet,

              senderDomain:
                processed.senderDomain,

              ClassificationResult: processed.classificationResult,
            } satisfies EmailMetadata;
          } catch (error) {
            console.error(
              `Failed to fetch message ${msg.id}`,
              error
            );

            return null;
          }
        })
      );

      relevantEmails.push(
        ...results.filter(
          (
            email
          ): email is EmailMetadata =>
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

    console.log(
      `Found ${relevantEmails.length} relevant emails`
    );

    return relevantEmails;
  } catch (error) {
    console.error(
      "Failed to fetch emails:",
      error
    );
    throw error;
  }
};