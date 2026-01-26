"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Camera,
  Users,
  Check,
  Sparkles,
  Zap,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const steps = [
  { id: 1, title: "PRODUCT", icon: Package },
  { id: 2, title: "CONTENT", icon: Camera },
  { id: 3, title: "CRITERIA", icon: Users },
  { id: 4, title: "LAUNCH", icon: Sparkles },
];

const platformIconSize = "h-6 w-6";

const PlatformIcon = ({ id, className }: { id: string; className?: string }) => {
  const classes = className ? `${platformIconSize} ${className}` : platformIconSize;
  switch (id) {
    case "TIKTOK":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={classes}
          fill="currentColor"
        >
          <path d="M16.5 3c.6 2.4 2.3 4.1 4.5 4.6v3.2c-1.6-.1-3.1-.6-4.5-1.5v6.3c0 3-2.4 5.4-5.4 5.4S5.7 18.6 5.7 15.6s2.4-5.4 5.4-5.4c.4 0 .8 0 1.2.1v3.2c-.4-.2-.8-.3-1.2-.3-1.2 0-2.1 1-2.1 2.2s1 2.1 2.2 2.1 2.1-1 2.1-2.2V3h3.2z" />
        </svg>
      );
    case "YOUTUBE":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={classes}
          fill="currentColor"
        >
          <path d="M22 8.3c0-1.6-1.1-3-2.6-3.3C17 4.5 7 4.5 4.6 5 3.1 5.3 2 6.7 2 8.3v7.4c0 1.6 1.1 3 2.6 3.3 2.4.5 12.4.5 14.8 0 1.5-.3 2.6-1.7 2.6-3.3V8.3zM10 15V9l5 3-5 3z" />
        </svg>
      );
    case "INSTAGRAM":
      return (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={classes}
          fill="currentColor"
        >
          <path d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm5-1.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" />
        </svg>
      );
    default:
      return <span className={className ?? ""}>*</span>;
  }
};

const allowedCreatorPlatformIds = new Set(["TIKTOK"]);
const comingSoonPlatforms = [
  { id: "YOUTUBE", label: "YouTube" },
  { id: "INSTAGRAM", label: "Instagram" },
];

const contentTypeXp: Record<string, number> = {
  REEL: 50,
  STORY: 20,
  FEED_POST: 40,
  REVIEW_VIDEO: 60,
  OTHER: 30,
};

type FulfillmentType = "" | "SHOPIFY" | "MANUAL";

type CampaignFormData = {
  productName: string;
  productValue: string;
  category: string;
  categoryOther: string;
  description: string;
  productImage: string;
  presetId: string;
  fulfillmentType: FulfillmentType;
  manualFulfillmentMethod: "" | "PICKUP" | "LOCAL_DELIVERY";
  manualFulfillmentNotes: string;
  platforms: string[];
  platformOther: string;
  contentTypes: string[];
  contentTypeOther: string;
  hashtags: string;
  guidelines: string;
  usageRightsRequired: boolean;
  usageRightsScope: "PAID_ADS_12MO" | "PAID_ADS_6MO" | "PAID_ADS_UNLIMITED" | "ORGANIC_ONLY";
  minFollowers: string;
  maxFollowers: string;
  niches: string[];
  nicheOther: string;
  locationRadiusMiles: string;
  ctaUrl: string;
  campaignName: string;
  quantity: string;
};

const initialFormData: CampaignFormData = {
  productName: "",
  productValue: "",
  category: "",
  categoryOther: "",
  description: "",
  productImage: "",
  presetId: "",
  fulfillmentType: "MANUAL",
  manualFulfillmentMethod: "PICKUP",
  manualFulfillmentNotes: "",
  platforms: ["TIKTOK"],
  platformOther: "",
  contentTypes: [],
  contentTypeOther: "",
  hashtags: "",
  guidelines: "",
  usageRightsRequired: false,
  usageRightsScope: "PAID_ADS_12MO",
  minFollowers: "1000",
  maxFollowers: "50000",
  niches: [],
  nicheOther: "",
  locationRadiusMiles: "",
  ctaUrl: "",
  campaignName: "",
  quantity: "10",
};

type OfferMetadata = Partial<{
  campaignName: string;
  productValue: number | string;
  category: string;
  categoryOther: string;
  description: string;
  platforms: unknown;
  platformOther: string;
  contentTypes: unknown;
  contentTypeOther: string;
  hashtags: string;
  guidelines: string;
  niches: unknown;
  nicheOther: string;
  presetId: string;
  fulfillmentType: FulfillmentType;
  manualFulfillmentMethod: "PICKUP" | "LOCAL_DELIVERY";
  manualFulfillmentNotes: string;
  locationRadiusKm: number | string;
  locationRadiusMiles: number | string;
  ctaUrl: string;
}>;

type PicklistItem = { id: string; label: string };
type OfferPreset = { id: string; label: string; description: string; platforms: string[]; contentTypes: string[] };
type PicklistsResponse = {
  ok: boolean;
  campaignCategories: PicklistItem[];
  creatorCategories: PicklistItem[];
  contentTypes: PicklistItem[];
  platforms: PicklistItem[];
  offerPresets: OfferPreset[];
};

type BrandOffer = {
  id: string;
  title: string;
  template: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  maxClaims: number | null;
  deadlineDaysAfterDelivery: number;
  acceptanceFollowersThreshold: number | null;
  usageRightsRequired: boolean | null;
  usageRightsScope: string | null;
  metadata: Record<string, unknown> | null;
};

type CreatorRecommendation = {
  creatorId: string;
  username: string;
  score: number;
  reason: string;
  distanceKm?: number | null;
  distanceMiles?: number | null;
};

type ApiError = Error & { status?: number; code?: string; data?: { errorId?: string } };

const milesToKm = (miles: number) => miles * 1.609344;
const kmToMiles = (km: number) => km / 1.609344;

type StringArrayField = {
  [Key in keyof CampaignFormData]: CampaignFormData[Key] extends string[] ? Key : never;
}[keyof CampaignFormData];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const DRAFT_KEY = "frilpp:brandCampaignDraft:v1";

type AiCreatorAvailability = "idle" | "checking" | "available" | "empty" | "error";
type NoticeKind = "success" | "error" | "info";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    code?: string;
    errorId?: string;
  };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    err.data = { errorId: data?.errorId };
    throw err;
  }
  return data;
}

function BrandCampaignCreatorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerIdParam = searchParams.get("offerId");
  const isEditingDraft = Boolean(offerIdParam);

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [copying, setCopying] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [draftOfferId, setDraftOfferId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const restoredRef = useRef(false);
  const draftReadyRef = useRef(false);
  const aiCheckKeyRef = useRef<string | null>(null);
  const [aiCreatorAvailability, setAiCreatorAvailability] = useState<AiCreatorAvailability>("idle");
  const [notice, setNotice] = useState<{ kind: NoticeKind; text: string } | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [picklists, setPicklists] = useState<PicklistsResponse | null>(null);
  const [picklistsError, setPicklistsError] = useState<string | null>(null);

  const [draftRecommendations, setDraftRecommendations] = useState<CreatorRecommendation[]>([]);
  const [draftRecommendationsLoading, setDraftRecommendationsLoading] = useState(false);

  const showNotice = useCallback((kind: NoticeKind, text: string) => {
    setNotice({ kind, text });
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => setNotice(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<PicklistsResponse>("/api/meta/picklists");
        if (cancelled) return;
        setPicklists(res);
      } catch {
        if (!cancelled) setPicklistsError("Failed to load picklists.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    if (offerIdParam) {
      draftReadyRef.current = true;
      return;
    }

    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      draftReadyRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object") {
        draftReadyRef.current = true;
        return;
      }

      const draft = parsed as Partial<{
        currentStep: unknown;
        formData: Partial<CampaignFormData> | null;
        draftOfferId: unknown;
      }>;

      const draftForm =
        draft.formData && typeof draft.formData === "object"
          ? (draft.formData as Partial<CampaignFormData>)
          : null;

      if (draftForm) {
        setFormData((prev) => ({
          ...prev,
          ...draftForm,
          platforms: Array.isArray(draftForm.platforms) ? draftForm.platforms : prev.platforms,
          contentTypes: Array.isArray(draftForm.contentTypes) ? draftForm.contentTypes : prev.contentTypes,
          niches: Array.isArray(draftForm.niches) ? draftForm.niches : prev.niches,
          fulfillmentType: "MANUAL",
        }));
      }

      if (typeof draft.currentStep === "number" && Number.isFinite(draft.currentStep)) {
        const step = Math.max(1, Math.min(4, Math.floor(draft.currentStep)));
        setCurrentStep(step);
      }

      if (typeof draft.draftOfferId === "string" || draft.draftOfferId === null) {
        setDraftOfferId(draft.draftOfferId ?? null);
      }

      showNotice("success", "Draft restored");
    } catch {
      // ignore
    } finally {
      draftReadyRef.current = true;
    }
  }, [offerIdParam, showNotice]);

  useEffect(() => {
    if (!offerIdParam) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; offer: BrandOffer }>(
          `/api/brand/offers/${encodeURIComponent(offerIdParam)}`,
        );
        if (cancelled) return;
        const offer = res.offer;
        const meta = (offer.metadata ?? {}) as OfferMetadata;
        const radiusKm = (() => {
          const kmRaw = meta.locationRadiusKm;
          const km =
            typeof kmRaw === "number"
              ? kmRaw
              : typeof kmRaw === "string" && kmRaw.trim()
                ? Number(kmRaw)
                : null;
          if (km !== null && Number.isFinite(km) && km > 0) return km;
          const milesRaw = meta.locationRadiusMiles;
          const miles =
            typeof milesRaw === "number"
              ? milesRaw
              : typeof milesRaw === "string" && milesRaw.trim()
                ? Number(milesRaw)
                : null;
          if (miles !== null && Number.isFinite(miles) && miles > 0) return milesToKm(miles);
          return null;
        })();
        const radiusInput = radiusKm !== null ? kmToMiles(radiusKm) : null;

        setDraftOfferId(offer.id);
        setFormData((prev) => ({
          ...prev,
          productName: meta.campaignName || offer.title || prev.productName,
          productValue:
            meta.productValue !== null && meta.productValue !== undefined
              ? String(meta.productValue)
              : prev.productValue,
          category: meta.category || prev.category,
          categoryOther: meta.categoryOther || "",
          description: meta.description || "",
          platforms: asStringArray(meta.platforms),
          platformOther: meta.platformOther || "",
          contentTypes: asStringArray(meta.contentTypes),
          contentTypeOther: meta.contentTypeOther || "",
          hashtags: meta.hashtags || "",
          guidelines: meta.guidelines || "",
          niches: asStringArray(meta.niches),
          nicheOther: meta.nicheOther || "",
          campaignName: meta.campaignName || offer.title || "",
          quantity: String(offer.maxClaims ?? prev.quantity),
          minFollowers: String(offer.acceptanceFollowersThreshold ?? prev.minFollowers),
          presetId: meta.presetId || "",
          fulfillmentType: meta.fulfillmentType || prev.fulfillmentType,
          manualFulfillmentMethod: meta.manualFulfillmentMethod || prev.manualFulfillmentMethod,
          manualFulfillmentNotes: meta.manualFulfillmentNotes || "",
          usageRightsRequired: offer.usageRightsRequired ?? prev.usageRightsRequired,
          usageRightsScope: (offer.usageRightsScope as CampaignFormData["usageRightsScope"]) ?? prev.usageRightsScope,
          locationRadiusMiles: radiusInput !== null ? String(Math.round(radiusInput * 10) / 10) : "",
          ctaUrl: meta.ctaUrl || "",
        }));
        showNotice("success", "Draft loaded");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load draft";
        showNotice("error", message);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [offerIdParam, showNotice]);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const payload = {
      currentStep,
      formData,
      draftOfferId,
      updatedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [currentStep, formData, draftOfferId]);

  const campaignCategories = picklists?.campaignCategories ?? [];
  const creatorCategories = picklists?.creatorCategories ?? [];
  const contentTypeOptions = picklists?.contentTypes ?? [];
  const platformOptions = picklists?.platforms ?? [];
  const offerPresets = picklists?.offerPresets ?? [];
  const countriesAllowed = useMemo(() => [] as Array<"US" | "IN">, []);

  const offerDraftPayload = useMemo(() => {
    const minFollowers = Number(formData.minFollowers || 0);
    const maxFollowers = Number(formData.maxFollowers || 0);
    const radiusInput = Number(formData.locationRadiusMiles || 0);
    const radiusKm = milesToKm(radiusInput);
    return {
      title: formData.campaignName || formData.productName || undefined,
      countriesAllowed,
      platforms: formData.platforms,
      contentTypes: formData.contentTypes,
      niches: formData.niches,
      locationRadiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : undefined,
      minFollowers: Number.isFinite(minFollowers) ? minFollowers : undefined,
      maxFollowers: Number.isFinite(maxFollowers) && maxFollowers > 0 ? maxFollowers : undefined,
      category: formData.category || undefined,
      description: formData.description || undefined,
    };
  }, [formData, countriesAllowed]);

  const offerDraftKey = useMemo(() => JSON.stringify(offerDraftPayload), [offerDraftPayload]);

  const refetchDraftRecommendations = useCallback(async () => {
    setDraftRecommendationsLoading(true);
    try {
      const res = await fetchJson<{ ok: boolean; creators: CreatorRecommendation[] }>(
        "/api/ai/creators",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ offerDraft: offerDraftPayload, limit: 6 }),
        },
      );
      setDraftRecommendations(res.creators ?? []);
      setDraftRecommendationsLoading(false);
      return res;
    } catch {
      setDraftRecommendations([]);
      setDraftRecommendationsLoading(false);
      throw new Error("Failed to load creators");
    }
  }, [offerDraftPayload]);

  useEffect(() => {
    if (currentStep !== 4) return;
    if (aiCheckKeyRef.current === offerDraftKey) return;
    aiCheckKeyRef.current = offerDraftKey;
    setAiCreatorAvailability("checking");
    refetchDraftRecommendations()
      .then((result) => {
        const creators = result.creators ?? [];
        setAiCreatorAvailability(creators.length ? "available" : "empty");
      })
      .catch(() => {
        setAiCreatorAvailability("error");
      });
  }, [currentStep, offerDraftKey, refetchDraftRecommendations]);

  const availablePlatforms = useMemo(
    () => platformOptions.filter((item) => allowedCreatorPlatformIds.has(item.id)),
    [platformOptions],
  );

  useEffect(() => {
    const allowed = new Set(availablePlatforms.map((item) => item.id));
    setFormData((prev) => {
      const filtered = prev.platforms.filter((platform) => allowed.has(platform));
      if (filtered.length === prev.platforms.length) {
        return prev;
      }
      return {
        ...prev,
        platforms: filtered,
        platformOther: filtered.includes("OTHER") ? prev.platformOther : "",
      };
    });
  }, [availablePlatforms]);

  const updateField = <Key extends keyof CampaignFormData>(field: Key, value: CampaignFormData[Key]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: { id: string; platforms: string[]; contentTypes: string[] }) => {
    setFormData((prev) => ({
      ...prev,
      presetId: preset.id,
      platforms: preset.platforms,
      platformOther: "",
      contentTypes: preset.contentTypes,
      contentTypeOther: "",
    }));
  };

  const toggleArrayField = <Key extends StringArrayField>(field: Key, value: string) => {
    setFormData((prev) => {
      const current = prev[field];
      const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [field]: next };
    });
  };

  const buildOfferTemplate = () => {
    const types = formData.contentTypes;
    if (types.includes("REVIEW_VIDEO")) return "REEL";
    if (types.includes("REEL") && types.includes("STORY")) return "REEL_PLUS_STORY";
    if (types.includes("REEL")) return "REEL";
    if (types.includes("FEED_POST")) return "FEED";
    return "UGC_ONLY";
  };

  const buildOfferMetadata = (fulfillmentType: "SHOPIFY" | "MANUAL") => {
    const radiusInput = Number(formData.locationRadiusMiles || 0);
    const radiusKm = milesToKm(radiusInput);
    return {
      productValue: formData.productValue ? Number(formData.productValue) : null,
      category: formData.category || null,
      categoryOther: formData.category === "OTHER" ? formData.categoryOther.trim() || null : null,
      description: formData.description || null,
      platforms: formData.platforms,
      platformOther: formData.platforms.includes("OTHER") ? formData.platformOther.trim() || null : null,
      contentTypes: formData.contentTypes,
      contentTypeOther: formData.contentTypes.includes("OTHER")
        ? formData.contentTypeOther.trim() || null
        : null,
      hashtags: formData.hashtags || null,
      guidelines: formData.guidelines || null,
      niches: formData.niches,
      nicheOther: formData.niches.includes("OTHER") ? formData.nicheOther.trim() || null : null,
      campaignName: formData.campaignName || null,
      fulfillmentType,
      manualFulfillmentMethod:
        fulfillmentType === "MANUAL" && formData.manualFulfillmentMethod
          ? formData.manualFulfillmentMethod
          : null,
      manualFulfillmentNotes: formData.manualFulfillmentNotes.trim() || null,
      locationRadiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : null,
      ctaUrl: formData.ctaUrl.trim() || null,
      presetId: formData.presetId || null,
    };
  };

  const buildOfferProducts = () => [];

  const saveDraftToServer = async () => {
    if (savingDraft) return;
    const fulfillmentType: FulfillmentType = "MANUAL";
    const template = buildOfferTemplate();
    const titleRaw = formData.campaignName || formData.productName;
    const title = titleRaw && titleRaw.trim().length >= 3 ? titleRaw.trim() : "Untitled campaign";
    const minFollowers = Number(formData.minFollowers || 0);
    const maxClaims = Number(formData.quantity || 1);

    const basePayload = {
      title,
      template,
      status: "DRAFT" as const,
      countriesAllowed,
      maxClaims: Number.isFinite(maxClaims) ? maxClaims : 1,
      deadlineDaysAfterDelivery: 14,
      followersThreshold: Number.isFinite(minFollowers) ? minFollowers : 0,
      usageRightsRequired: formData.usageRightsRequired,
      usageRightsScope: formData.usageRightsRequired ? formData.usageRightsScope : undefined,
      products: buildOfferProducts(),
      metadata: buildOfferMetadata(fulfillmentType),
    };

    setSavingDraft(true);
    try {
      if (!draftOfferId) {
        const res = await fetchJson<{ ok: boolean; offerId: string }>("/api/brand/offers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(basePayload),
        });
        setDraftOfferId(res.offerId);
        showNotice("success", "Draft saved");
      } else {
        try {
          await fetchJson(`/api/brand/offers/${encodeURIComponent(draftOfferId)}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(basePayload),
          });
        } catch (err) {
          if (err instanceof Error && "status" in err && (err as ApiError).status === 404) {
            setDraftOfferId(null);
            const res = await fetchJson<{ ok: boolean; offerId: string }>("/api/brand/offers", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify(basePayload),
            });
            setDraftOfferId(res.offerId);
            showNotice("success", "Draft recreated");
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "NEEDS_LOCATION") {
        showNotice("error", "Please add your brand location in Settings before creating campaigns.");
        window.location.href = "/brand/settings";
        return;
      }
      const message = apiErr?.message ?? "Draft save failed";
      showNotice("error", message);
      if (apiErr?.status === 401) {
        window.location.href = "/brand/auth";
      }
    } finally {
      setSavingDraft(false);
    }
  };

  const nextStep = async () => {
    if (currentStep >= 4) return;
    await saveDraftToServer();
    setCurrentStep((prev) => prev + 1);
  };

  const prevStep = async () => {
    if (currentStep <= 1) return;
    await saveDraftToServer();
    setCurrentStep((prev) => prev - 1);
  };

  const handleLaunch = () => {
    if (launching) return;
    const template = buildOfferTemplate();

    const title = formData.campaignName || formData.productName;
    if (!title) {
      showNotice("error", "Campaign name required");
      setCurrentStep(1);
      return;
    }

    if (formData.category === "OTHER" && !formData.categoryOther.trim()) {
      showNotice("error", "Add a category for Other");
      setCurrentStep(1);
      return;
    }
    if (formData.contentTypes.includes("OTHER") && !formData.contentTypeOther.trim()) {
      showNotice("error", "Add a content type for Other");
      setCurrentStep(2);
      return;
    }
    if (formData.niches.includes("OTHER") && !formData.nicheOther.trim()) {
      showNotice("error", "Add a niche for Other");
      setCurrentStep(3);
      return;
    }

    const minFollowers = Number(formData.minFollowers || 0);
    const maxClaims = Number(formData.quantity || 1);
    const fulfillmentType: FulfillmentType = "MANUAL";

    const products = buildOfferProducts();
    const metadata = buildOfferMetadata(fulfillmentType);

    setLaunching(true);

    const publishPayload = {
      title,
      template,
      status: "PUBLISHED" as const,
      countriesAllowed,
      maxClaims: Number.isFinite(maxClaims) ? maxClaims : 1,
      deadlineDaysAfterDelivery: 14,
      followersThreshold: Number.isFinite(minFollowers) ? minFollowers : 0,
      usageRightsRequired: formData.usageRightsRequired,
      usageRightsScope: formData.usageRightsRequired ? formData.usageRightsScope : undefined,
      products,
      metadata,
    };

    const publish = async () => {
      if (!draftOfferId) {
        await fetchJson("/api/brand/offers", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(publishPayload),
        });
        return;
      }
      try {
        await fetchJson(`/api/brand/offers/${encodeURIComponent(draftOfferId)}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(publishPayload),
        });
      } catch (err) {
        if (err instanceof Error && "status" in err && (err as ApiError).status === 404) {
          setDraftOfferId(null);
          await fetchJson("/api/brand/offers", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(publishPayload),
          });
          return;
        }
        throw err;
      }
    };

    publish()
      .then(() => {
        showNotice("success", "Campaign launched. Creators can now apply.");
        localStorage.removeItem(DRAFT_KEY);
        setDraftOfferId(null);
        router.push("/brand/campaigns");
      })
      .catch((err) => {
        const apiErr = err as ApiError;
        if (apiErr.code === "NEEDS_LOCATION") {
          showNotice("error", "Please add your brand location in Settings before launching campaigns.");
          window.location.href = "/brand/settings";
          return;
        }
        const errorId =
          apiErr.data && typeof apiErr.data.errorId === "string" ? apiErr.data.errorId : null;
        const message = apiErr?.message ?? "Failed to launch campaign";
        const full = errorId ? `${message} (errorId: ${errorId})` : message;
        showNotice("error", full);
        if (apiErr?.status === 401) {
          window.location.href = "/brand/auth";
        }
      })
      .finally(() => {
        setLaunching(false);
      });
  };

  const calculateXP = () => {
    let xp = 0;
    formData.contentTypes.forEach((type) => {
      xp += contentTypeXp[type] ?? 0;
    });
    return xp * parseInt(formData.quantity || "1", 10);
  };

  const formatDistance = (distance: { distanceKm?: number | null; distanceMiles?: number | null }) => {
    const raw = distance.distanceMiles ?? null;
    if (raw === null || raw === undefined) return null;
    if (raw < 1) return "<1mi";
    return `${raw.toFixed(raw < 10 ? 1 : 0)}mi`;
  };

  const handleCopyLastOffer = async () => {
    try {
      setCopying(true);
      const res = await fetchJson<{ ok: boolean; offers: BrandOffer[] }>("/api/brand/offers");
      const last = res.offers?.[0];
      if (!last) {
        showNotice("error", "No previous offers found");
        return;
      }
      const meta = (last.metadata ?? {}) as OfferMetadata;
      const radiusKm = (() => {
        const kmRaw = meta.locationRadiusKm;
        const km =
          typeof kmRaw === "number"
            ? kmRaw
            : typeof kmRaw === "string" && kmRaw.trim()
              ? Number(kmRaw)
              : null;
        if (km !== null && Number.isFinite(km) && km > 0) return km;
        const milesRaw = meta.locationRadiusMiles;
        const miles =
          typeof milesRaw === "number"
            ? milesRaw
            : typeof milesRaw === "string" && milesRaw.trim()
              ? Number(milesRaw)
              : null;
        if (miles !== null && Number.isFinite(miles) && miles > 0) return milesToKm(miles);
        return null;
      })();
      const radiusInput = radiusKm !== null ? kmToMiles(radiusKm) : null;
      setFormData((prev) => ({
        ...prev,
        productName: meta.campaignName || last.title || prev.productName,
        productValue:
          meta.productValue !== null && meta.productValue !== undefined
            ? String(meta.productValue)
            : prev.productValue,
        category: meta.category || prev.category,
        categoryOther: meta.categoryOther || "",
        description: meta.description || "",
        platforms: asStringArray(meta.platforms),
        platformOther: meta.platformOther || "",
        contentTypes: asStringArray(meta.contentTypes),
        contentTypeOther: meta.contentTypeOther || "",
        hashtags: meta.hashtags || "",
        guidelines: meta.guidelines || "",
        niches: asStringArray(meta.niches),
        nicheOther: meta.nicheOther || "",
        campaignName: meta.campaignName || last.title || "",
        quantity: String(last.maxClaims ?? prev.quantity),
        minFollowers: String(last.acceptanceFollowersThreshold ?? prev.minFollowers),
        presetId: meta.presetId || "",
        fulfillmentType: meta.fulfillmentType || prev.fulfillmentType,
        manualFulfillmentMethod: meta.manualFulfillmentMethod || prev.manualFulfillmentMethod,
        manualFulfillmentNotes: meta.manualFulfillmentNotes || "",
        usageRightsRequired: last.usageRightsRequired ?? prev.usageRightsRequired,
        usageRightsScope: (last.usageRightsScope as CampaignFormData["usageRightsScope"]) ?? prev.usageRightsScope,
        locationRadiusMiles: radiusInput !== null ? String(Math.round(radiusInput * 10) / 10) : "",
        ctaUrl: meta.ctaUrl || "",
      }));
      showNotice("success", "Last offer copied");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Copy failed";
      showNotice("error", message);
    } finally {
      setCopying(false);
    }
  };

  const noticeStyles = useMemo(() => {
    if (!notice) return "";
    if (notice.kind === "success") {
      return "border-neon-green bg-neon-green/10 text-neon-green";
    }
    if (notice.kind === "error") {
      return "border-neon-pink bg-neon-pink/10 text-neon-pink";
    }
    return "border-neon-yellow bg-neon-yellow/10 text-neon-yellow";
  }, [notice]);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b-4 border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/brand/campaigns")}
                className="border-2 border-border pixel-btn"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <span className="text-xs font-pixel text-neon-purple">
                  {isEditingDraft ? "[EDIT_DRAFT]" : "[NEW_CAMPAIGN]"}
                </span>
                <h1 className="text-lg font-pixel text-foreground">
                  {isEditingDraft ? "CONTINUE DRAFT" : "CREATE OFFER"}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-muted border-2 border-neon-yellow">
              <Star className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
              <span className="font-mono text-sm text-neon-yellow">{calculateXP()} XP</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b-2 border-border bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 border-2 transition-all ${
                    currentStep === step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep > step.id
                        ? "border-neon-green bg-neon-green/20 text-neon-green"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  <span className="text-xs font-pixel hidden md:block">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 md:w-16 h-1 mx-2 ${currentStep > step.id ? "bg-neon-green" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {notice ? (
            <div className={`mb-6 border-2 px-4 py-3 text-xs font-mono ${noticeStyles}`}>
              {notice.text}
            </div>
          ) : null}
          {picklistsError ? (
            <div className="mb-6 border-2 border-neon-pink bg-neon-pink/10 px-4 py-3 text-xs font-mono text-neon-pink">
              {picklistsError}
            </div>
          ) : null}

          {currentStep === 1 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-green/10 border-2 border-neon-green mb-4">
                  <Package className="w-5 h-5 text-neon-green" />
                  <span className="font-pixel text-sm text-neon-green">STEP 1</span>
                </div>
                <h2 className="text-xl font-pixel">PRODUCT DETAILS</h2>
                <p className="font-mono text-sm text-muted-foreground mt-2">&gt; What are you offering?</p>
              </div>
              <div className="flex items-center justify-between border-2 border-border bg-card/80 p-4">
                <div>
                  <p className="font-pixel text-xs text-neon-green">FAST START</p>
                  <p className="font-mono text-xs text-muted-foreground">Copy your last offer in one click.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={copying}
                    onClick={handleCopyLastOffer}
                    className="border-2 border-border font-pixel text-xs"
                  >
                    {copying ? "COPYING..." : "COPY_LAST_OFFER"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.removeItem(DRAFT_KEY);
                      setFormData(initialFormData);
                      setCurrentStep(1);
                      showNotice("success", "Draft cleared");
                    }}
                    className="border-2 border-border font-pixel text-xs"
                  >
                    CLEAR_DRAFT
                  </Button>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-mono text-sm">PRODUCT_NAME</Label>
                  <Input
                    value={formData.productName}
                    onChange={(e) => updateField("productName", e.target.value)}
                    placeholder="e.g. GlowUp Vitamin C Serum"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">FULFILLMENT</Label>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("fulfillmentType", "MANUAL")}
                      className={`p-4 border-2 text-left transition-all pixel-btn ${
                        formData.fulfillmentType === "MANUAL"
                          ? "border-neon-purple bg-neon-purple/20"
                          : "border-border hover:border-neon-purple"
                      }`}
                    >
                      <p className="font-pixel text-xs text-neon-purple">MANUAL_SHIP</p>
                      <p className="font-mono text-xs text-muted-foreground mt-1">
                        Ship yourself. We will track and remind.
                      </p>
                    </button>
                  </div>
                </div>

                {formData.fulfillmentType === "MANUAL" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">MANUAL_METHOD</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => updateField("manualFulfillmentMethod", "PICKUP")}
                          className={`p-3 border-2 text-center transition-all pixel-btn ${
                            formData.manualFulfillmentMethod === "PICKUP"
                              ? "border-neon-green bg-neon-green/20 text-neon-green"
                              : "border-border hover:border-neon-green"
                          }`}
                        >
                          <span className="font-pixel text-xs">PICKUP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateField("manualFulfillmentMethod", "LOCAL_DELIVERY")}
                          className={`p-3 border-2 text-center transition-all pixel-btn ${
                            formData.manualFulfillmentMethod === "LOCAL_DELIVERY"
                              ? "border-neon-green bg-neon-green/20 text-neon-green"
                              : "border-border hover:border-neon-green"
                          }`}
                        >
                          <span className="font-pixel text-xs">LOCAL_DELIVERY</span>
                        </button>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground">
                        Pickup uses your brand address. Local delivery asks creators for their address at claim time.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label className="font-mono text-sm">MANUAL_NOTES</Label>
                      <Input
                        value={formData.manualFulfillmentNotes}
                        onChange={(e) => updateField("manualFulfillmentNotes", e.target.value)}
                        placeholder="Pickup window / delivery notes..."
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-mono text-sm">PRODUCT_VALUE ($)</Label>
                  <Input
                    type="number"
                    value={formData.productValue}
                    onChange={(e) => updateField("productValue", e.target.value)}
                    placeholder="45"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">CATEGORY</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {campaignCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => updateField("category", cat.id)}
                        className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                          formData.category === cat.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border hover:border-primary"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.category === "OTHER" && (
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">CATEGORY_OTHER</Label>
                    <Input
                      value={formData.categoryOther}
                      onChange={(e) => updateField("categoryOther", e.target.value)}
                      placeholder="e.g. Fragrance, Jewelry"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-mono text-sm">DESCRIPTION</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Tell creators about your product..."
                    className="border-2 border-border font-mono focus:border-primary min-h-[100px]"
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-pink/10 border-2 border-neon-pink mb-4">
                  <Camera className="w-5 h-5 text-neon-pink" />
                  <span className="font-pixel text-sm text-neon-pink">STEP 2</span>
                </div>
                <h2 className="text-xl font-pixel">CONTENT REQUIREMENTS</h2>
                <p className="font-mono text-sm text-muted-foreground mt-2">&gt; What content do you need?</p>
              </div>

              <div className="space-y-6">
                {offerPresets.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">PRESET_TEMPLATES</Label>
                    <div className="grid md:grid-cols-2 gap-3">
                      {offerPresets.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset)}
                          className={`p-4 border-2 text-left transition-all pixel-btn cursor-pointer ${
                            formData.presetId === preset.id
                              ? "border-neon-yellow bg-neon-yellow/20"
                              : "border-border hover:border-neon-yellow"
                          }`}
                        >
                          <p className="font-pixel text-xs text-neon-yellow">{preset.label}</p>
                          <p className="font-mono text-xs text-muted-foreground mt-1">{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">WHERE_CREATORS_POST</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[...availablePlatforms, ...comingSoonPlatforms.filter((p) => !availablePlatforms.find((a) => a.id === p.id))].map(
                      (platform) => {
                        const enabled = allowedCreatorPlatformIds.has(platform.id);
                        const isActive = formData.platforms.includes(platform.id);
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            disabled={!enabled}
                            aria-pressed={isActive}
                            data-active={isActive ? "true" : "false"}
                            onClick={enabled ? () => toggleArrayField("platforms", platform.id) : undefined}
                            className={`p-4 border-2 text-center transition-all pixel-btn ${
                              enabled
                                ? isActive
                                  ? "border-neon-pink bg-neon-pink/25 ring-2 ring-neon-pink/40 cursor-pointer"
                                  : "border-border hover:border-neon-pink cursor-pointer"
                                : "border-border bg-muted/40 text-muted-foreground opacity-60 cursor-not-allowed"
                            }`}
                          >
                            <span className="mb-2 flex items-center justify-center">
                              <PlatformIcon
                                id={platform.id}
                                className={enabled ? "text-foreground" : "text-muted-foreground"}
                              />
                            </span>
                            <span className="font-mono text-xs">{platform.label}</span>
                            {!enabled ? (
                              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">COMING SOON</span>
                            ) : null}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">CONTENT_TYPES (select multiple)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {contentTypeOptions.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => toggleArrayField("contentTypes", type.id)}
                        className={`p-4 border-2 flex items-center justify-between transition-all pixel-btn cursor-pointer ${
                          formData.contentTypes.includes(type.id)
                            ? "border-neon-green bg-neon-green/20"
                            : "border-border hover:border-neon-green"
                        }`}
                      >
                        <span className="font-mono text-sm">{type.label}</span>
                        <span className="font-pixel text-xs text-neon-yellow">+{contentTypeXp[type.id] ?? 0}XP</span>
                      </button>
                    ))}
                  </div>
                </div>

                {formData.contentTypes.includes("OTHER") && (
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">CONTENT_TYPE_OTHER</Label>
                    <Input
                      value={formData.contentTypeOther}
                      onChange={(e) => updateField("contentTypeOther", e.target.value)}
                      placeholder="e.g. Live stream, Carousel"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-mono text-sm">HASHTAGS (comma separated)</Label>
                  <Input
                    value={formData.hashtags}
                    onChange={(e) => updateField("hashtags", e.target.value)}
                    placeholder="#skincare, #glowup, #beauty"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">CONTENT_GUIDELINES</Label>
                  <Textarea
                    value={formData.guidelines}
                    onChange={(e) => updateField("guidelines", e.target.value)}
                    placeholder="Any specific requirements or creative direction..."
                    className="border-2 border-border font-mono focus:border-primary min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">USAGE_RIGHTS</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => updateField("usageRightsRequired", true)}
                      className={`p-3 border-2 text-center transition-all pixel-btn ${
                        formData.usageRightsRequired
                          ? "border-neon-yellow bg-neon-yellow/20 text-neon-yellow"
                          : "border-border hover:border-neon-yellow"
                      }`}
                    >
                      <span className="font-pixel text-xs">REQUIRED</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateField("usageRightsRequired", false)}
                      className={`p-3 border-2 text-center transition-all pixel-btn ${
                        !formData.usageRightsRequired
                          ? "border-neon-yellow bg-neon-yellow/20 text-neon-yellow"
                          : "border-border hover:border-neon-yellow"
                      }`}
                    >
                      <span className="font-pixel text-xs">NOT_REQUIRED</span>
                    </button>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground">
                    If required, creators must grant usage rights so you can run their content as ads.
                  </p>
                </div>

                {formData.usageRightsRequired && (
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">USAGE_RIGHTS_SCOPE</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "PAID_ADS_12MO", label: "PAID_ADS_12MO" },
                        { id: "PAID_ADS_6MO", label: "PAID_ADS_6MO" },
                        { id: "PAID_ADS_UNLIMITED", label: "PAID_ADS_UNLIMITED" },
                        { id: "ORGANIC_ONLY", label: "ORGANIC_ONLY" },
                      ].map((scope) => (
                        <button
                          key={scope.id}
                          type="button"
                          onClick={() => updateField("usageRightsScope", scope.id as CampaignFormData["usageRightsScope"])}
                          className={`p-3 border-2 text-center transition-all pixel-btn ${
                            formData.usageRightsScope === scope.id
                              ? "border-neon-yellow bg-neon-yellow/20 text-neon-yellow"
                              : "border-border hover:border-neon-yellow"
                          }`}
                        >
                          <span className="font-mono text-xs">{scope.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border-2 border-neon-purple mb-4">
                  <Users className="w-5 h-5 text-neon-purple" />
                  <span className="font-pixel text-sm text-neon-purple">STEP 3</span>
                </div>
                <h2 className="text-xl font-pixel">CREATOR CRITERIA</h2>
                <p className="font-mono text-sm text-muted-foreground mt-2">&gt; Who is your ideal creator?</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">MIN_FOLLOWERS</Label>
                    <Input
                      type="number"
                      value={formData.minFollowers}
                      onChange={(e) => updateField("minFollowers", e.target.value)}
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">MAX_FOLLOWERS</Label>
                    <Input
                      type="number"
                      value={formData.maxFollowers}
                      onChange={(e) => updateField("maxFollowers", e.target.value)}
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">PREFERRED_NICHES</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {creatorCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => toggleArrayField("niches", cat.id)}
                        className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                          formData.niches.includes(cat.id)
                            ? "border-neon-purple bg-neon-purple/20 text-neon-purple"
                            : "border-border hover:border-neon-purple"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.niches.includes("OTHER") && (
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">NICHE_OTHER</Label>
                    <Input
                      value={formData.nicheOther}
                      onChange={(e) => updateField("nicheOther", e.target.value)}
                      placeholder="e.g. Streetwear, Tech gadgets"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-mono text-sm">NEARBY_RADIUS (miles)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.locationRadiusMiles}
                    onChange={(e) => updateField("locationRadiusMiles", e.target.value)}
                    placeholder="e.g. 25"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                  <p className="text-xs font-mono text-muted-foreground">
                    Optional: show this offer only to creators within this distance. No radius = global visibility.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">CTA_URL</Label>
                  <Input
                    value={formData.ctaUrl}
                    onChange={(e) => updateField("ctaUrl", e.target.value)}
                    placeholder="https://your-site.com/order (optional)"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                  <p className="text-xs font-mono text-muted-foreground">
                    Optional: link for creators or customers (product page, booking, or signup).
                  </p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-8 animate-fade-in">
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-yellow/10 border-2 border-neon-yellow mb-4">
                  <Sparkles className="w-5 h-5 text-neon-yellow animate-pulse-neon" />
                  <span className="font-pixel text-sm text-neon-yellow">FINAL STEP</span>
                </div>
                <h2 className="text-xl font-pixel">REVIEW & LAUNCH</h2>
                <p className="font-mono text-sm text-muted-foreground mt-2">&gt; Ready to go live?</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="font-mono text-sm">CAMPAIGN_NAME</Label>
                  <Input
                    value={formData.campaignName}
                    onChange={(e) => updateField("campaignName", e.target.value)}
                    placeholder="e.g. Summer Glow Launch"
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-sm">NUMBER_OF_PRODUCTS (how many to seed)</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => updateField("quantity", e.target.value)}
                    className="border-2 border-border font-mono focus:border-primary"
                  />
                </div>

                <div className="border-4 border-primary p-6 space-y-4 pixel-border-primary">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-primary animate-pulse-neon" />
                    <span className="font-pixel text-sm text-primary">CAMPAIGN SUMMARY</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground">PRODUCT:</span>
                      <p className="text-foreground">{formData.productName || "Not set"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">VALUE:</span>
                      <p className="text-neon-green">${formData.productValue || "0"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PLATFORMS:</span>
                      <p className="text-foreground">{formData.platforms.length || 0} selected</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CONTENT:</span>
                      <p className="text-foreground">{formData.contentTypes.length || 0} types</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AUDIENCE:</span>
                      <p className="text-foreground">
                        {formData.minFollowers}-{formData.maxFollowers}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">QUANTITY:</span>
                      <p className="text-neon-pink">{formData.quantity} products</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-border flex items-center justify-between">
                    <span className="font-mono text-sm text-muted-foreground">TOTAL XP POTENTIAL:</span>
                    <span className="font-pixel text-xl text-neon-yellow">{calculateXP()} XP</span>
                  </div>
                </div>

                <div className="border-4 border-border bg-card">
                  <div className="p-4 border-b-4 border-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-neon-yellow" />
                      <span className="font-pixel text-sm text-neon-yellow">[AI_MATCHES]</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-border font-mono text-xs"
                      onClick={() => {
                        setAiCreatorAvailability("checking");
                        refetchDraftRecommendations()
                          .then((result) => {
                            const creators = result.creators ?? [];
                            setAiCreatorAvailability(creators.length ? "available" : "empty");
                          })
                          .catch(() => {
                            setAiCreatorAvailability("error");
                          });
                      }}
                      disabled={
                        draftRecommendationsLoading ||
                        aiCreatorAvailability === "checking" ||
                        aiCreatorAvailability === "empty"
                      }
                    >
                      {draftRecommendationsLoading || aiCreatorAvailability === "checking"
                        ? "THINKING..."
                        : aiCreatorAvailability === "empty"
                          ? "NO_CREATORS"
                          : "GENERATE"}
                    </Button>
                  </div>
                  <div className="divide-y-2 divide-border">
                    {draftRecommendations.length ? (
                      draftRecommendations.map((creator) => (
                        <div key={creator.creatorId} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-mono text-sm">{creator.username}</p>
                            <p className="text-xs font-mono text-muted-foreground">{creator.reason}</p>
                            {formatDistance(creator) ? (
                              <p className="text-xs font-mono text-neon-blue">{formatDistance(creator)} away</p>
                            ) : null}
                          </div>
                          <div className="text-right">
                            <p className="font-pixel text-sm text-neon-green">{creator.score}</p>
                            <p className="text-xs font-mono text-muted-foreground">AI score</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-xs font-mono text-muted-foreground">
                        {aiCreatorAvailability === "checking"
                          ? "Checking creator availability..."
                          : aiCreatorAvailability === "empty"
                            ? "No creators on Frilpp yet. Invite creators to join, then try again."
                            : aiCreatorAvailability === "error"
                              ? "Unable to load creators right now. Please try again."
                              : "Generate AI matches to preview high-potential creators."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-12 pt-8 border-t-2 border-border">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1 || savingDraft || launching}
              className="border-2 border-border font-pixel text-xs px-6 pixel-btn disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={nextStep}
                disabled={savingDraft || launching}
                className="bg-primary text-primary-foreground font-pixel text-xs px-6 pixel-btn glow-green"
              >
                {savingDraft ? "SAVING..." : "NEXT"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                disabled={launching}
                className="bg-neon-pink text-background font-pixel text-xs px-8 pixel-btn glow-pink animate-pulse-neon"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {launching ? "LAUNCHING..." : "LAUNCH CAMPAIGN"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BrandCampaignCreatorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="p-6 md:p-10">
            <div className="font-mono text-xs text-muted-foreground">Loading campaign creator…</div>
          </div>
        </div>
      }
    >
      <BrandCampaignCreatorContent />
    </Suspense>
  );
}
