import {
  APPLICATION_SHORTLISTED_PATTERNS,
  APPLICATION_REJECTED_PATTERNS,
  MEDIUM_APPLICATION_PATTERNS,
  WEAK_APPLICATION_PATTERNS,
  STRICTLY_EXCLUDE_PHRASES,
  ASSESSMENT_KEYWORDS,
  INTERVIEW_KEYWORDS,
} from "../constants/emailKeywords.js";

import type { ClassificationResult } from "../types.js";

export function classifyByKeywords(
  subject: string,
  snippet: string,
  sender: string
): ClassificationResult {
  const text = `${subject} ${snippet} ${sender}`.toLowerCase();
  const matchedKeywords: string[] = [];

  // --------------------------------------------------
  // 1. HARD EXCLUSIONS — return immediately with 0 confidence
  // --------------------------------------------------
  const excludeMatch = STRICTLY_EXCLUDE_PHRASES.find((phrase) =>
    text.includes(phrase.toLowerCase())
  );
  if (excludeMatch) {
    return {
      classification: "other",
      confidence: 0,
      matchedKeywords: [],
      excludeKeywords: [excludeMatch],
    };
  }

  // --------------------------------------------------
  // 2. REJECTED PATTERNS -> 100 confidence
  // --------------------------------------------------
  for (const phrase of APPLICATION_REJECTED_PATTERNS) {
    if (text.includes(phrase.toLowerCase())) {
      return {
        classification: "application_rejected",
        confidence: 100,
        matchedKeywords: [phrase],
      };
    }
  }

  // --------------------------------------------------
  // 3. SHORTLISTED PATTERNS -> 100 confidence
  // --------------------------------------------------
  for (const phrase of APPLICATION_SHORTLISTED_PATTERNS) {
    if (text.includes(phrase.toLowerCase())) {
      return {
        classification: "application_shortlisted",
        confidence: 100,
        matchedKeywords: [phrase],
      };
    }
  }




  // --------------------------------------------------
  // 3. INTERVIEW — send to LLM (confidence < 100)
  // --------------------------------------------------
  const interviewMatches = INTERVIEW_KEYWORDS.filter((kw) =>
    text.includes(kw.toLowerCase())
  );
  if (interviewMatches.length > 0) {
    return {
      classification: "interview",
      confidence: Math.min(99, 80 + interviewMatches.length * 10),
      matchedKeywords: interviewMatches,
    };
  }

  // --------------------------------------------------
  // 4. ASSESSMENT — send to LLM (confidence < 100)
  // --------------------------------------------------
  const assessmentMatches = ASSESSMENT_KEYWORDS.filter((kw) =>
    text.includes(kw.toLowerCase())
  );
  if (assessmentMatches.length > 0) {
    return {
      classification: "assessment",
      confidence: Math.min(99, 80 + assessmentMatches.length * 10),
      matchedKeywords: assessmentMatches,
    };
  }

  // --------------------------------------------------
  // 5. MEDIUM + WEAK APPLICATION SCORING — send to LLM if score >= 40
  // --------------------------------------------------
  let score = 0;

  for (const keyword of MEDIUM_APPLICATION_PATTERNS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 20;
      matchedKeywords.push(keyword);
    }
  }

  for (const keyword of WEAK_APPLICATION_PATTERNS) {
    if (text.includes(keyword.toLowerCase())) {
      score += 10;
      matchedKeywords.push(keyword);
    }
  }

  score = Math.min(score, 99); // cap at 99 — LLM decides final verdict

  if (score >= 10) {
    return {
      classification: "other",
      confidence: score,
      matchedKeywords,
    };
  }

  // Not enough signal → discard
  return {
    classification: "other",
    confidence: 0,
    matchedKeywords,
  };
}