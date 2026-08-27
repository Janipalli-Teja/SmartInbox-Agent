import { gemini } from "../config/gemini.js";
import type { EmailMetadata, ClassificationResult } from "../types.js";

// Helper to call Gemini with exponential backoff on 429 errors
async function generateGeminiContent(prompt: string, categories: string[], maxRetries = 3, baseDelayMs = 2000) {
  let attempt = 0;
  while (true) {
    try {
      const response = await gemini.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                emailId: { type: "STRING", description: "The unique ID (id) of the email being classified." },
                category: { type: "STRING", enum: [...categories, "other"], description: "The classification category for the email." },
                confidence: { type: "INTEGER", description: "Confidence percentage score (0-100)." },
                reason: { type: "STRING", description: "Brief reason explaining why this email was classified into this category." },
                matched_keywords: { type: "ARRAY", items: { type: "STRING" }, description: "List of matched keywords from the email." },
                exclude_keywords: { type: "ARRAY", items: { type: "STRING" }, description: "List of keywords suggesting exclusion." }
              },
              required: ["emailId", "category", "confidence", "reason", "matched_keywords", "exclude_keywords"]
            }
          }
        }
      });
      return response;
    } catch (error: any) {
      const isRateLimit = error?.code === 429 || String(error).includes("429");
      if (isRateLimit && attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(`Gemini rate limit encountered, retrying in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise(res => setTimeout(res, delay));
        attempt++;
        continue;
      }
      throw error;
    }
  }
}

const VALID_CATEGORIES: ClassificationResult["classification"][] = [
  "application_shortlisted",
  "application_rejected",
  "assessment",
  "interview"
];

interface GeminiClassificationResult {
  emailId: string;

  category: ClassificationResult["classification"];

  confidence: number;

  reason: string;

  matched_keywords: string[];

  exclude_keywords: string[];
}

export const classifyEmailsWithGemini =
  async (
    emails: EmailMetadata[],
    categories: ClassificationResult["classification"][] = VALID_CATEGORIES
  ): Promise<EmailMetadata[]> => {
    if (!emails.length) {
      return [];
    }

    const prompt = `
You are a recruitment email classifier.

VALID_CATEGORIES:

${categories.map((cat, i) => `${i + 1}. ${cat}`).join("\n")}

TASK:

For each email:

- Determine the best category.
- If email belongs to none of the categories:
  - category = "other"
  - confidence = 0

- Return matched_keywords when positive.
- Return exclude_keywords when negative.

Return ONLY valid JSON.

Emails:

${JSON.stringify(
  emails.map((email) => ({
    id: email.id,
    subject: email.subject,
    from: email.from,
    snippet: email.snippet,
  })),
  null,
  2
)}
`;

    const response = await generateGeminiContent(prompt, categories);

    const text = response.text ?? "[]";

    const results =
      JSON.parse(
        text
      ) as GeminiClassificationResult[];

    const resultMap = new Map(
      results.map((result) => [
        result.emailId,
        result,
      ])
    );

    const verifiedEmails: EmailMetadata[] =
      [];

    for (const email of emails) {
      const geminiResult =
        resultMap.get(email.id);

      if (!geminiResult) continue;

      // reject non-job emails
      if (
        geminiResult.category === "other" ||
        geminiResult.confidence === 0
      ) {
        console.log(
          "Excluded:",
          geminiResult.exclude_keywords
        );

        continue;
      }

      verifiedEmails.push({
        ...email,

        ClassificationResult: {
          ...email.ClassificationResult,

          classification:
            geminiResult.category as ClassificationResult["classification"],

          confidence:
            geminiResult.confidence,

          llmVerified: true,

          reason:
            geminiResult.reason,

          matchedKeywords:
            geminiResult.matched_keywords,

          excludeKeywords:
            geminiResult.exclude_keywords,
        },
      });
    }

    return verifiedEmails;
  };