import type { DeliverableType } from "@/lib/demo-data";

export type OfferTemplateId = "REEL" | "FEED" | "REEL_PLUS_STORY" | "UGC_ONLY";

export function templateToDeliverableType(template: OfferTemplateId): DeliverableType {
  if (template === "FEED") return "FEED";
  if (template === "UGC_ONLY") return "UGC_ONLY";
  return "REELS";
}
