export type CountryCode = "US" | "IN";
export type DeliverableType = "REELS" | "FEED" | "UGC_ONLY";

export type OfferCard = {
  id: string;
  brandName: string;
  title: string;
  valueUsd: number;
  deliverable: DeliverableType;
  usageRightsRequired?: boolean;
  usageRightsScope?: string | null;
  countriesAllowed: CountryCode[];
  deadlineDaysAfterDelivery: number;
  maxClaims: number;
  locationRadius?: number | null;
  distance?: number | null;
  unit?: "MI" | "KM";
  fulfillmentType?: "MANUAL" | "SHOPIFY" | null;
  manualFulfillmentMethod?: "PICKUP" | "LOCAL_DELIVERY" | null;
  manualFulfillmentNotes?: string | null;
};

export const demoOffers: OfferCard[] = [
  {
    id: "offer_soap_01",
    brandName: "GlowBar",
    title: "Free $50 skincare set for 1 Reel",
    valueUsd: 50,
    deliverable: "REELS",
    countriesAllowed: ["US", "IN"],
    deadlineDaysAfterDelivery: 7,
    maxClaims: 50,
  },
  {
    id: "offer_protein_01",
    brandName: "PeakFuel",
    title: "Free supplements pack for 1 Feed Post",
    valueUsd: 35,
    deliverable: "FEED",
    countriesAllowed: ["US"],
    deadlineDaysAfterDelivery: 10,
    maxClaims: 25,
  },
  {
    id: "offer_candle_01",
    brandName: "Wick&Co",
    title: "Free candle set for UGC video (no posting)",
    valueUsd: 40,
    deliverable: "UGC_ONLY",
    countriesAllowed: ["IN"],
    deadlineDaysAfterDelivery: 10,
    maxClaims: 30,
  },
];
