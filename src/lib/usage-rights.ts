export const USAGE_RIGHTS_SCOPES = [
  "PAID_ADS_12MO",
  "PAID_ADS_6MO",
  "PAID_ADS_UNLIMITED",
  "ORGANIC_ONLY",
] as const;

export type UsageRightsScope = (typeof USAGE_RIGHTS_SCOPES)[number];

export function formatUsageRightsScope(scope: string | null | undefined) {
  switch (scope) {
    case "PAID_ADS_12MO":
      return "Paid ads (12 months)";
    case "PAID_ADS_6MO":
      return "Paid ads (6 months)";
    case "PAID_ADS_UNLIMITED":
      return "Paid ads (unlimited)";
    case "ORGANIC_ONLY":
      return "Organic reposting only";
    default:
      return "Usage rights";
  }
}

