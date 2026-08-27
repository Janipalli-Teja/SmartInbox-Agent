import { extractDomain } from "../utils/extractDomain.js";
import { classifyByKeywords } from "../classifiers/keywordClassifier.js";

export function processEmail(
  subject: string,
  from: string,
  snippet: string,
  sender:string
) {
  return {
    senderDomain: extractDomain(from),
    classificationResult:
      classifyByKeywords(
        subject,
        snippet,
        sender
      ),
  };
}