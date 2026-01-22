import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ArrowRight, 
  Package, 
  Camera, 
  Users, 
  Check,
  Sparkles,
  Zap,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import BrandLayout from "@/components/brand/BrandLayout";
import {
  ApiError,
  ShopifyProduct,
  apiUrl,
  createBrandOffer,
  updateBrandOffer,
  getCreatorRecommendations,
  getBrandOffers,
  getPicklists,
  getShopifyProducts,
  getShopifyStatus,
} from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const steps = [
  { id: 1, title: "PRODUCT", icon: Package },
  { id: 2, title: "CONTENT", icon: Camera },
  { id: 3, title: "CRITERIA", icon: Users },
  { id: 4, title: "LAUNCH", icon: Sparkles },
];

const platformIcons: Record<string, string> = {
  TIKTOK: "🎵",
  YOUTUBE: "▶️",
  INSTAGRAM: "📸",
  OTHER: "✨",
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

type CampaignRegion = "US" | "IN" | "US_IN";
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
  platforms: string[];
  platformOther: string;
  contentTypes: string[];
  contentTypeOther: string;
  hashtags: string;
  guidelines: string;
  minFollowers: string;
  maxFollowers: string;
  niches: string[];
  nicheOther: string;
  region: CampaignRegion;
  locationRadiusMiles: string;
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
  platforms: [],
  platformOther: "",
  contentTypes: [],
  contentTypeOther: "",
  hashtags: "",
  guidelines: "",
  minFollowers: "1000",
  maxFollowers: "50000",
  niches: [],
  nicheOther: "",
  region: "US_IN",
  locationRadiusMiles: "",
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
  region: CampaignRegion;
  presetId: string;
  fulfillmentType: FulfillmentType;
  locationRadiusKm: number | string;
  locationRadiusMiles: number | string;
}>;

const milesToKm = (miles: number) => miles * 1.609344;
const kmToMiles = (km: number) => km / 1.609344;

type StringArrayField = {
  [Key in keyof CampaignFormData]: CampaignFormData[Key] extends string[] ? Key : never;
}[keyof CampaignFormData];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const emptyPlatformsByCountry = { US: [], IN: [] };

const DRAFT_KEY = "frilpp:brandCampaignDraft:v1";

type AiCreatorAvailability = "idle" | "checking" | "available" | "empty" | "error";

const CampaignCreator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CampaignFormData>(initialFormData);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);
  const [copying, setCopying] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [draftOfferId, setDraftOfferId] = useState<string | null>(null);
  const [savingDraft, setSavingDraft] = useState(false);
  const restoredRef = useRef(false);
  const draftReadyRef = useRef(false);
  const aiCheckKeyRef = useRef<string | null>(null);
  const [aiCreatorAvailability, setAiCreatorAvailability] = useState<AiCreatorAvailability>("idle");

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

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
        productQuantity: unknown;
        selectedVariantId: unknown;
        draftOfferId: unknown;
      }>;

      if (draft.formData && typeof draft.formData === "object") {
        setFormData((prev) => ({
          ...prev,
          ...draft.formData,
          platforms: Array.isArray(draft.formData.platforms) ? draft.formData.platforms : prev.platforms,
          contentTypes: Array.isArray(draft.formData.contentTypes) ? draft.formData.contentTypes : prev.contentTypes,
          niches: Array.isArray(draft.formData.niches) ? draft.formData.niches : prev.niches,
          fulfillmentType: "MANUAL",
        }));
      }

      if (typeof draft.currentStep === "number" && Number.isFinite(draft.currentStep)) {
        const step = Math.max(1, Math.min(4, Math.floor(draft.currentStep)));
        setCurrentStep(step);
      }

      if (typeof draft.productQuantity === "number" && Number.isFinite(draft.productQuantity)) {
        setProductQuantity(Math.max(1, Math.floor(draft.productQuantity)));
      }

      if (typeof draft.selectedVariantId === "string" || draft.selectedVariantId === null) {
        setSelectedVariantId(draft.selectedVariantId);
      }

      if (typeof draft.draftOfferId === "string" || draft.draftOfferId === null) {
        setDraftOfferId(draft.draftOfferId);
      }

      toast.success("Draft restored");
    } catch {
      // Ignore corrupted drafts.
    } finally {
      draftReadyRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    const payload = {
      currentStep,
      formData,
      productQuantity,
      selectedVariantId,
      draftOfferId,
      updatedAt: Date.now(),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  }, [currentStep, formData, productQuantity, selectedVariantId, draftOfferId]);

  const { data: shopifyStatus } = useQuery({
    queryKey: ["shopify-status"],
    queryFn: getShopifyStatus,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["shopify-products", productSearch],
    queryFn: () => getShopifyProducts(productSearch, 10),
    enabled: Boolean(shopifyStatus?.connected),
  });

  const { data: picklists } = useQuery({
    queryKey: ["picklists"],
    queryFn: getPicklists,
  });

  const campaignCategories = picklists?.campaignCategories ?? [];
  const creatorCategories = picklists?.creatorCategories ?? [];
  const contentTypeOptions = picklists?.contentTypes ?? [];
  const regionOptions = picklists?.regions ?? [];
  const platformsByCountry = picklists?.platformsByCountry ?? emptyPlatformsByCountry;
  const offerPresets = picklists?.offerPresets ?? [];
  const countriesAllowed = useMemo(() => {
    if (formData.region === "US") return ["US"] as Array<"US" | "IN">;
    if (formData.region === "IN") return ["IN"] as Array<"US" | "IN">;
    return ["US", "IN"] as Array<"US" | "IN">;
  }, [formData.region]);

  const offerDraftPayload = useMemo(() => {
    const minFollowers = Number(formData.minFollowers || 0);
    const maxFollowers = Number(formData.maxFollowers || 0);
    const isKm = countriesAllowed.length === 1 && countriesAllowed[0] === "IN";
    const radiusInput = Number(formData.locationRadiusMiles || 0);
    const radiusKm = isKm ? radiusInput : milesToKm(radiusInput);
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

  const {
    data: draftRecommendationsData,
    isFetching: draftRecommendationsLoading,
    refetch: refetchDraftRecommendations,
  } = useQuery({
    queryKey: ["creator-recommendations", offerDraftKey],
    queryFn: () => getCreatorRecommendations({ offerDraft: offerDraftPayload, limit: 6 }),
    enabled: false,
  });

  useEffect(() => {
    if (currentStep !== 4) return;
    if (aiCheckKeyRef.current === offerDraftKey) return;
    aiCheckKeyRef.current = offerDraftKey;
    setAiCreatorAvailability("checking");
    refetchDraftRecommendations()
      .then((result) => {
        const creators = result.data?.creators ?? [];
        setAiCreatorAvailability(creators.length ? "available" : "empty");
      })
      .catch(() => {
        setAiCreatorAvailability("error");
      });
  }, [currentStep, offerDraftKey, refetchDraftRecommendations]);

  const availablePlatforms = useMemo(() => {
    const region = formData.region || "US_IN";
    if (region === "US") return platformsByCountry.US.filter((p) => allowedCreatorPlatformIds.has(p.id));
    if (region === "IN") return platformsByCountry.IN.filter((p) => allowedCreatorPlatformIds.has(p.id));
    const byId = new Map(platformsByCountry.US.map((item) => [item.id, item]));
    return platformsByCountry.IN.filter((item) => byId.has(item.id) && allowedCreatorPlatformIds.has(item.id));
  }, [formData.region, platformsByCountry]);

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

  useEffect(() => {
    if (!shopifyStatus) return;
    setFormData((prev) => {
      if (prev.fulfillmentType) return { ...prev, fulfillmentType: "MANUAL" };
      return {
        ...prev,
        fulfillmentType: "MANUAL",
      };
    });
  }, [shopifyStatus]);

  const updateField = <Key extends keyof CampaignFormData>(field: Key, value: CampaignFormData[Key]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const applyPreset = (preset: { id: string; platforms: string[]; contentTypes: string[] }) => {
    setFormData(prev => ({
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
    if (types.includes("REEL") && types.includes("STORY")) return "REEL_PLUS_STORY";
    if (types.includes("REEL")) return "REEL";
    if (types.includes("FEED_POST")) return "FEED";
    return "UGC_ONLY";
  };

  const buildOfferMetadata = (fulfillmentType: "SHOPIFY" | "MANUAL") => {
    const isKm = countriesAllowed.length === 1 && countriesAllowed[0] === "IN";
    const radiusInput = Number(formData.locationRadiusMiles || 0);
    const radiusKm = isKm ? radiusInput : milesToKm(radiusInput);
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
      region: formData.region || null,
      campaignName: formData.campaignName || null,
      fulfillmentType,
      locationRadiusKm: Number.isFinite(radiusKm) && radiusKm > 0 ? radiusKm : null,
      presetId: formData.presetId || null,
    };
  };

  const buildOfferProducts = (fulfillmentType: "SHOPIFY" | "MANUAL") => {
    if (fulfillmentType !== "SHOPIFY" || !selectedProduct || !selectedVariantId) return [];
    return [
      {
        shopifyProductId: selectedProduct.id,
        shopifyVariantId: selectedVariantId,
        quantity: Math.max(1, productQuantity || 1),
      },
    ];
  };

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
      aboveThresholdAutoAccept: true,
      products: buildOfferProducts(fulfillmentType),
      metadata: buildOfferMetadata(fulfillmentType),
    };

    setSavingDraft(true);
    try {
      if (!draftOfferId) {
        const toastId = toast.loading("Saving draft...");
        const res = await createBrandOffer(basePayload);
        toast.dismiss(toastId);
        setDraftOfferId(res.offerId);
        toast.success("Draft saved");
      } else {
        await updateBrandOffer(draftOfferId, basePayload);
      }
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Draft save failed";
      toast.error(message);
      if (err instanceof ApiError && err.status === 401) {
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
      toast.error("Campaign name required");
      setCurrentStep(1);
      return;
    }

    if (formData.category === "OTHER" && !formData.categoryOther.trim()) {
      toast.error("Add a category for Other");
      setCurrentStep(1);
      return;
    }
    if (formData.contentTypes.includes("OTHER") && !formData.contentTypeOther.trim()) {
      toast.error("Add a content type for Other");
      setCurrentStep(2);
      return;
    }
    if (formData.niches.includes("OTHER") && !formData.nicheOther.trim()) {
      toast.error("Add a niche for Other");
      setCurrentStep(3);
      return;
    }

    const minFollowers = Number(formData.minFollowers || 0);
    const maxClaims = Number(formData.quantity || 1);
    const allowedCountries = countriesAllowed;
    const fulfillmentType: FulfillmentType = "MANUAL";

    const products = buildOfferProducts(fulfillmentType);
    const metadata = buildOfferMetadata(fulfillmentType);

    const toastId = toast.loading("Launching campaign...");
    setLaunching(true);

    const publishPayload = {
      title,
      template,
      status: "PUBLISHED" as const,
      countriesAllowed: allowedCountries,
      maxClaims: Number.isFinite(maxClaims) ? maxClaims : 1,
      deadlineDaysAfterDelivery: 14,
      followersThreshold: Number.isFinite(minFollowers) ? minFollowers : 0,
      aboveThresholdAutoAccept: true,
      products,
      metadata,
    };

    const publish =
      draftOfferId
        ? updateBrandOffer(draftOfferId, publishPayload)
        : createBrandOffer(publishPayload);

    publish
      .then(() => {
        toast.dismiss(toastId);
        toast.success("🎮 Campaign launched! Let the matching begin!", {
          description: "Influencers will start seeing your offer.",
        });
        localStorage.removeItem(DRAFT_KEY);
        setDraftOfferId(null);
        navigate("/brand/campaigns");
      })
      .catch((err) => {
        toast.dismiss(toastId);
        const errorId =
          err instanceof ApiError && err.data && typeof err.data.errorId === "string"
            ? err.data.errorId
            : null;
        const message = err instanceof ApiError ? err.message : "Failed to launch campaign";
        const full = errorId ? `${message} (errorId: ${errorId})` : message;
        console.error("launch campaign failed", err);
        toast.error(full);
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/brand/auth";
        }
      })
      .finally(() => {
        setLaunching(false);
      });
  };

  const calculateXP = () => {
    let xp = 0;
    formData.contentTypes.forEach(type => {
      xp += contentTypeXp[type] ?? 0;
    });
    return xp * parseInt(formData.quantity || "1");
  };

  const formatDistance = (distance: { distanceKm?: number | null; distanceMiles?: number | null }) => {
    const isKm = countriesAllowed.length === 1 && countriesAllowed[0] === "IN";
    const raw = isKm
      ? distance.distanceKm ??
        (distance.distanceMiles !== null && distance.distanceMiles !== undefined
          ? milesToKm(distance.distanceMiles)
          : null)
      : distance.distanceMiles ?? null;
    const unit = isKm ? "km" : "mi";
    if (raw === null || raw === undefined) return null;
    if (raw < 1) return isKm ? "<1km" : "<1mi";
    return `${raw.toFixed(raw < 10 ? 1 : 0)}${unit}`;
  };

  const handleCopyLastOffer = async () => {
    try {
      setCopying(true);
      const res = await getBrandOffers();
      const last = res.offers?.[0];
      if (!last) {
        toast.error("No previous offers found");
        return;
      }
      const meta = (last.metadata ?? {}) as OfferMetadata;
      const region =
        last.countriesAllowed?.length === 2
          ? "US_IN"
          : last.countriesAllowed?.[0] === "IN"
            ? "IN"
            : "US";
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
      const radiusInput =
        region === "IN" ? radiusKm : radiusKm !== null ? kmToMiles(radiusKm) : null;
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
        region: meta.region || region,
        campaignName: meta.campaignName || last.title || "",
        quantity: String(last.maxClaims ?? prev.quantity),
        minFollowers: String(last.acceptanceFollowersThreshold ?? prev.minFollowers),
        presetId: meta.presetId || "",
        fulfillmentType: meta.fulfillmentType || prev.fulfillmentType,
        locationRadiusMiles: radiusInput !== null ? String(Math.round(radiusInput * 10) / 10) : "",
      }));
      setSelectedProduct(null);
      setSelectedVariantId(null);
      toast.success("Last offer copied");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Copy failed";
      toast.error(message);
    } finally {
      setCopying(false);
    }
  };

  return (
    <BrandLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b-4 border-border bg-card">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => navigate("/brand/campaigns")}
                  className="border-2 border-border pixel-btn"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <span className="text-xs font-pixel text-neon-purple">[NEW_CAMPAIGN]</span>
                  <h1 className="text-lg font-pixel text-foreground">CREATE OFFER</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted border-2 border-neon-yellow">
                <Star className="w-4 h-4 text-neon-yellow animate-pulse-neon" />
                <span className="font-mono text-sm text-neon-yellow">{calculateXP()} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="border-b-2 border-border bg-card/50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div 
                    className={`flex items-center gap-2 px-4 py-2 border-2 transition-all ${
                      currentStep === step.id 
                        ? 'border-primary bg-primary text-primary-foreground' 
                        : currentStep > step.id
                          ? 'border-neon-green bg-neon-green/20 text-neon-green'
                          : 'border-border text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                    <span className="text-xs font-pixel hidden md:block">{step.title}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 md:w-16 h-1 mx-2 ${currentStep > step.id ? 'bg-neon-green' : 'bg-border'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Step 1: Product Details */}
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
                        setSelectedProduct(null);
                        setSelectedVariantId(null);
                        setProductQuantity(1);
                        setCurrentStep(1);
                        toast.success("Draft cleared");
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
                      onChange={(e) => updateField('productName', e.target.value)}
                      placeholder="e.g. GlowUp Vitamin C Serum"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>

                  {false ? (
                    <div className="space-y-2">
                    <Label className="font-mono text-sm">STORE_PRODUCT</Label>
                    {shopifyStatus?.connected ? (
                      <>
                        <Input
                          value={productSearch}
                          onChange={(event) => setProductSearch(event.target.value)}
                          placeholder="Search connected products..."
                          className="border-2 border-border font-mono focus:border-primary"
                        />
                        <div className="border-2 border-border bg-muted/30 max-h-48 overflow-y-auto">
                          {productsLoading ? (
                            <div className="p-3 text-xs font-mono text-muted-foreground">Loading products...</div>
                          ) : (
                            (productsData?.products ?? []).map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProduct(product);
                                  setSelectedVariantId(product.variants[0]?.id ?? null);
                                  if (!formData.productName) {
                                    updateField("productName", product.title);
                                  }
                                }}
                                className={`w-full text-left p-3 border-b-2 border-border font-mono text-xs transition-all ${
                                  selectedProduct?.id === product.id
                                    ? "bg-primary text-primary-foreground"
                                    : "hover:bg-muted"
                                }`}
                              >
                                {product.title}
                              </button>
                            ))
                          )}
                          {!productsLoading && (productsData?.products?.length ?? 0) === 0 && (
                            <div className="p-3 text-xs font-mono text-muted-foreground">
                              No products found.
                            </div>
                          )}
                        </div>
                        {selectedProduct && (
                          <div className="grid md:grid-cols-2 gap-3">
                            <div>
                              <Label className="font-mono text-xs">VARIANT</Label>
                              <select
                                value={selectedVariantId ?? ""}
                                onChange={(event) => setSelectedVariantId(event.target.value)}
                                className="mt-2 w-full border-2 border-border bg-background px-3 py-2 text-xs font-mono"
                              >
                                {selectedProduct.variants.map((variant) => (
                                  <option key={variant.id} value={variant.id}>
                                    {variant.title}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <Label className="font-mono text-xs">QUANTITY</Label>
                              <Input
                                type="number"
                                min={1}
                                value={productQuantity}
                                onChange={(event) => setProductQuantity(Number(event.target.value))}
                                className="mt-2 border-2 border-border font-mono"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="border-2 border-border p-4 text-xs font-mono text-muted-foreground">
                        Connect your store to pull product details.
                        <Button
                          asChild
                          size="sm"
                          className="ml-3 bg-primary text-primary-foreground font-pixel text-xs"
                        >
                          <a href={apiUrl("/api/shopify/install")}>CONNECT STORE</a>
                        </Button>
                      </div>
                    )}
                    </div>
                  ) : null}
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
                          Ship yourself. We’ll track and remind.
                        </p>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">PRODUCT_VALUE ($)</Label>
                    <Input 
                      type="number"
                      value={formData.productValue}
                      onChange={(e) => updateField('productValue', e.target.value)}
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
                          onClick={() => updateField('category', cat.id)}
                          className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                            formData.category === cat.id 
                              ? 'border-primary bg-primary text-primary-foreground' 
                              : 'border-border hover:border-primary'
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
                        onChange={(e) => updateField('categoryOther', e.target.value)}
                        placeholder="e.g. Fragrance, Jewelry"
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">DESCRIPTION</Label>
                    <Textarea 
                      value={formData.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      placeholder="Tell creators about your product..."
                      className="border-2 border-border font-mono focus:border-primary min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Content Requirements */}
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
                            className={`p-4 border-2 text-left transition-all pixel-btn ${
                              formData.presetId === preset.id
                                ? "border-neon-yellow bg-neon-yellow/20"
                                : "border-border hover:border-neon-yellow"
                            }`}
                          >
                            <p className="font-pixel text-xs text-neon-yellow">{preset.label}</p>
                            <p className="font-mono text-xs text-muted-foreground mt-1">
                              {preset.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                <div className="space-y-2">
                  <Label className="font-mono text-sm">WHERE_CREATORS_POST</Label>
                  <div className="grid grid-cols-2 gap-3">
                      {[...availablePlatforms, ...comingSoonPlatforms.filter((p) => !availablePlatforms.find((a) => a.id === p.id))].map((platform) => {
                        const enabled = platform.id === "TIKTOK";
                        const isActive = formData.platforms.includes(platform.id);
                        return (
                          <button
                            key={platform.id}
                            type="button"
                            disabled={!enabled}
                            onClick={enabled ? () => toggleArrayField('platforms', platform.id) : undefined}
                            className={`p-4 border-2 text-center transition-all pixel-btn ${
                              enabled
                                ? isActive
                                  ? 'border-neon-pink bg-neon-pink/20'
                                  : 'border-border hover:border-neon-pink'
                                : 'border-border bg-muted/40 text-muted-foreground opacity-60 cursor-not-allowed'
                            }`}
                          >
                            <span className="text-2xl mb-2 block">{platformIcons[platform.id] ?? "✨"}</span>
                            <span className="font-mono text-xs">{platform.label}</span>
                            {!enabled ? (
                              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                                COMING SOON
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                  </div>
                </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">CONTENT_TYPES (select multiple)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {contentTypeOptions.map((type) => (
                        <button
                          key={type.id}
                          onClick={() => toggleArrayField('contentTypes', type.id)}
                          className={`p-4 border-2 flex items-center justify-between transition-all pixel-btn ${
                            formData.contentTypes.includes(type.id)
                              ? 'border-neon-green bg-neon-green/20' 
                              : 'border-border hover:border-neon-green'
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
                        onChange={(e) => updateField('contentTypeOther', e.target.value)}
                        placeholder="e.g. Live stream, Carousel"
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">HASHTAGS (comma separated)</Label>
                    <Input 
                      value={formData.hashtags}
                      onChange={(e) => updateField('hashtags', e.target.value)}
                      placeholder="#skincare, #glowup, #beauty"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">CONTENT_GUIDELINES</Label>
                    <Textarea 
                      value={formData.guidelines}
                      onChange={(e) => updateField('guidelines', e.target.value)}
                      placeholder="Any specific requirements or creative direction..."
                      className="border-2 border-border font-mono focus:border-primary min-h-[100px]"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Influencer Criteria */}
            {currentStep === 3 && (
              <div className="space-y-8 animate-fade-in">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-neon-purple/10 border-2 border-neon-purple mb-4">
                    <Users className="w-5 h-5 text-neon-purple" />
                    <span className="font-pixel text-sm text-neon-purple">STEP 3</span>
                  </div>
                  <h2 className="text-xl font-pixel">CREATOR CRITERIA</h2>
                  <p className="font-mono text-sm text-muted-foreground mt-2">&gt; Who’s your ideal creator?</p>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">MIN_FOLLOWERS</Label>
                      <Input 
                        type="number"
                        value={formData.minFollowers}
                        onChange={(e) => updateField('minFollowers', e.target.value)}
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">MAX_FOLLOWERS</Label>
                      <Input 
                        type="number"
                        value={formData.maxFollowers}
                        onChange={(e) => updateField('maxFollowers', e.target.value)}
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
                          onClick={() => toggleArrayField('niches', cat.id)}
                          className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                            formData.niches.includes(cat.id)
                              ? 'border-neon-purple bg-neon-purple/20 text-neon-purple' 
                              : 'border-border hover:border-neon-purple'
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
                        onChange={(e) => updateField('nicheOther', e.target.value)}
                        placeholder="e.g. Streetwear, Tech gadgets"
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">REGION</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {regionOptions.map((region) => (
                        <button
                          key={region.id}
                          onClick={() => updateField('region', region.id)}
                          className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                            formData.region === region.id
                              ? 'border-neon-purple bg-neon-purple/20 text-neon-purple'
                              : 'border-border hover:border-neon-purple'
                          }`}
                        >
                          {region.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">
                      NEARBY_RADIUS ({countriesAllowed.length === 1 && countriesAllowed[0] === "IN" ? "km" : "miles"})
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={formData.locationRadiusMiles}
                      onChange={(e) => updateField("locationRadiusMiles", e.target.value)}
                      placeholder="e.g. 25"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                    <p className="text-xs font-mono text-muted-foreground">
                      Optional: show this offer only to creators within this distance. Requires brand location.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Launch */}
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
                      onChange={(e) => updateField('campaignName', e.target.value)}
                      placeholder="e.g. Summer Glow Launch"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">NUMBER_OF_PRODUCTS (how many to seed)</Label>
                    <Input 
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => updateField('quantity', e.target.value)}
                      className="border-2 border-border font-mono focus:border-primary"
                    />
                  </div>

                  {/* Summary Card */}
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
                        <p className="text-foreground">{formData.minFollowers}-{formData.maxFollowers}</p>
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
	                              const creators = result.data?.creators ?? [];
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
	                      {(draftRecommendationsData?.creators ?? []).length ? (
	                        draftRecommendationsData?.creators.map((creator) => (
	                          <div key={creator.creatorId} className="p-4 flex items-center justify-between">
	                            <div>
	                              <p className="font-mono text-sm">{creator.username}</p>
	                              <p className="text-xs font-mono text-muted-foreground">{creator.reason}</p>
                              {formatDistance(creator) && (
                                <p className="text-xs font-mono text-neon-blue">
                                  {formatDistance(creator)} away
                                </p>
                              )}
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

            {/* Navigation */}
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
    </BrandLayout>
  );
};

export default CampaignCreator;
