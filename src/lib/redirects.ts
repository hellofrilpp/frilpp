export function sanitizeNextPath(input: string | null | undefined, fallback = "/onboarding") {
  if (!input) return fallback;
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  return trimmed;
}
