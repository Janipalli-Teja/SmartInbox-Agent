export function extractDomain(from: string) {
  const match = from.match(/@([^>\s]+)/);
  return match?.[1] ?? "";
}