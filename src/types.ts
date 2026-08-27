export interface EmailAnalysis {
  category:
    | "job-applications"
    | "refferals"
    | "job-update"
    | "job-assessments"
    | "promotion"
    | "companies"
    | "other";

  priority: "high" | "medium" | "low";

  summary: string;

  actionRequired: boolean;

  suggestedAction: string;
}

export type EmailMetadata = {
  id: string;
  subject?: string;
  from?: string;
  snippet?: string;
  body?: string;           // Full email body
  receivedAt?: string;     // ISO date string from internalDate
  senderDomain: string;
  initialConfidence?: number;
  ClassificationResult: ClassificationResult;
};

export type ClassificationResult = {
  classification:
    | "application_shortlisted"
    | "application_rejected"
    | "assessment"
    | "interview"
    | "other";

  confidence: number;
  llmVerified?: boolean;
  initialConfidence?: number;
  reason?: string;
  matchedKeywords: string[];
  excludeKeywords?: string[];
};