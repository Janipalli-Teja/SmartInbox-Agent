import {
  STRONG_APPLICATION_PATTERNS,
  MEDIUM_APPLICATION_PATTERNS,
  WEAK_APPLICATION_PATTERNS,
  STRICTLY_EXCLUDE_PHRASES,
  ASSESSMENT_KEYWORDS,
  INTERVIEW_KEYWORDS,
} from "../constants/emailKeywords.js";

import type { ClassificationResult } from "../types.js";

export function classifyByKeywords(
  subject: string,
  snippet: string
): ClassificationResult {
  const text =
    `${subject} ${snippet}`.toLowerCase();

  const matchedKeywords: string[] = [];

  // --------------------------------------------------
  // HARD EXCLUSIONS
  // --------------------------------------------------

  if (
    STRICTLY_EXCLUDE_PHRASES.some((phrase) =>
      text.includes(phrase.toLowerCase())
    )
  ) {
    return {
      classification: "other",
      confidence: 0,
      matchedKeywords,
    };
  }

  // --------------------------------------------------
  // EXACT APPLICATION MATCHES
  // --------------------------------------------------

  const exactApplicationMatches = [
    "application received",
    "thank you for applying",
    "your application has been successfully submitted",
    "we have received your application",
    "application confirmation",
    "application acknowledged",
  ];

  for (const phrase of exactApplicationMatches) {
    if (text.includes(phrase.toLowerCase())) {
      return {
        classification:
          "application_submitted",
        confidence: 100,
        matchedKeywords: [phrase],
      };
    }
  }

  // --------------------------------------------------
  // INTERVIEW
  // --------------------------------------------------

  const interviewMatches =
    INTERVIEW_KEYWORDS.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    );

  if (interviewMatches.length > 0) {
    return {
      classification: "interview",
      confidence: Math.min(
        100,
        80 + interviewMatches.length * 10
      ),
      matchedKeywords: interviewMatches,
    };
  }

  // --------------------------------------------------
  // ASSESSMENT
  // --------------------------------------------------

  const assessmentMatches =
    ASSESSMENT_KEYWORDS.filter((keyword) =>
      text.includes(keyword.toLowerCase())
    );

  if (assessmentMatches.length > 0) {
    return {
      classification: "assessment",
      confidence: Math.min(
        100,
        80 + assessmentMatches.length * 10
      ),
      matchedKeywords: assessmentMatches,
    };
  }

  // --------------------------------------------------
  // APPLICATION SCORING
  // --------------------------------------------------

  let score = 0;

  for (const keyword of STRONG_APPLICATION_PATTERNS) {
    if (
      text.includes(keyword.toLowerCase())
    ) {
      score += 40;
      matchedKeywords.push(keyword);
    }
  }

  for (const keyword of MEDIUM_APPLICATION_PATTERNS) {
    if (
      text.includes(keyword.toLowerCase())
    ) {
      score += 20;
      matchedKeywords.push(keyword);
    }
  }

  for (const keyword of WEAK_APPLICATION_PATTERNS) {
    if (
      text.includes(keyword.toLowerCase())
    ) {
      score += 10;
      matchedKeywords.push(keyword);
    }
  }

  score = Math.min(score, 100);

  if (score >= 40) {
    return {
      classification:
        "application_submitted",
      confidence: score,
      matchedKeywords,
    };
  }

  return {
    classification: "other",
    confidence: score,
    matchedKeywords,
  };
}