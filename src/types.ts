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
  senderDomain: string;
  ClassificationResult:ClassificationResult
};

export type ClassificationResult = {
  classification:
    | "application_submitted"
    | "assessment"
    | "interview"
    | "other";

  confidence: number;
  matchedKeywords:string[]
};