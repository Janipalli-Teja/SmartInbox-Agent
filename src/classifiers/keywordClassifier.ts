import {
  JOB_APPLICATION_KEYWORDS,
  ASSESSMENT_KEYWORDS,
  INTERVIEW_KEYWORDS,
  PROMOTION_KEYWORDS,
} from "../constants/emailKeywords.js";

export function classifyByKeywords(
  subject: string,
  snippet: string
) {
  const text = `${subject} ${snippet}`.toLowerCase();

  if (PROMOTION_KEYWORDS.some(k => text.includes(k))) {
    return "promotion";
  }

  if (JOB_APPLICATION_KEYWORDS.some(k => text.includes(k))) {
    return "application_submitted";
  }

  if (ASSESSMENT_KEYWORDS.some(k => text.includes(k))) {
    return "assessment";
  }

  if (INTERVIEW_KEYWORDS.some(k => text.includes(k))) {
    return "interview";
  }

  return "other";
}