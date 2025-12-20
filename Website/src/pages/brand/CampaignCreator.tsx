import { useEffect, useMemo, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import BrandLayout from "@/components/brand/BrandLayout";
import { ApiError, ShopifyProduct, apiUrl, createBrandOffer, getPicklists, getShopifyProducts, getShopifyStatus } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const steps = [
  { id: 1, title: "PRODUCT", icon: Package },
  { id: 2, title: "CONTENT", icon: Camera },
  { id: 3, title: "CRITERIA", icon: Users },
  { id: 4, title: "LAUNCH", icon: Sparkles },
];

const platformIcons: Record<string, string> = {
  INSTAGRAM: "📸",
  TIKTOK: "🎵",
  YOUTUBE: "▶️",
  OTHER: "✨",
};

const contentTypeXp: Record<string, number> = {
  REEL: 50,
  STORY: 20,
  FEED_POST: 40,
  REVIEW_VIDEO: 60,
  OTHER: 30,
};

const CampaignCreator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Product
    productName: "",
    productValue: "",
    category: "",
    categoryOther: "",
    description: "",
    productImage: "",
    
    // Step 2 - Content
    platforms: [] as string[],
    platformOther: "",
    contentTypes: [] as string[],
    contentTypeOther: "",
    hashtags: "",
    guidelines: "",
    
    // Step 3 - Criteria
    minFollowers: "1000",
    maxFollowers: "50000",
    niches: [] as string[],
    nicheOther: "",
    region: "US_IN",
    
    // Step 4 - Review
    campaignName: "",
    quantity: "10",
  });
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopifyProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [productQuantity, setProductQuantity] = useState(1);

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
  const platformsByCountry = picklists?.platformsByCountry ?? { US: [], IN: [] };

  const availablePlatforms = useMemo(() => {
    const region = formData.region || "US_IN";
    if (region === "US") return platformsByCountry.US;
    if (region === "IN") return platformsByCountry.IN;
    const byId = new Map(platformsByCountry.US.map((item) => [item.id, item]));
    return platformsByCountry.IN.filter((item) => byId.has(item.id));
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

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleArrayField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev as any)[field].includes(value)
        ? (prev as any)[field].filter((v: string) => v !== value)
        : [...(prev as any)[field], value]
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleLaunch = () => {
    const template = (() => {
      const types = formData.contentTypes;
      if (types.includes("REEL") && types.includes("STORY")) return "REEL_PLUS_STORY";
      if (types.includes("REEL")) return "REEL";
      if (types.includes("FEED_POST")) return "FEED";
      return "UGC_ONLY";
    })();

    const title = formData.campaignName || formData.productName;
    if (!title) {
      toast.error("Campaign name required");
      return;
    }

    if (formData.category === "OTHER" && !formData.categoryOther.trim()) {
      toast.error("Add a category for Other");
      return;
    }
    if (formData.platforms.includes("OTHER") && !formData.platformOther.trim()) {
      toast.error("Add a platform for Other");
      return;
    }
    if (formData.contentTypes.includes("OTHER") && !formData.contentTypeOther.trim()) {
      toast.error("Add a content type for Other");
      return;
    }
    if (formData.niches.includes("OTHER") && !formData.nicheOther.trim()) {
      toast.error("Add a niche for Other");
      return;
    }

    const minFollowers = Number(formData.minFollowers || 0);
    const maxClaims = Number(formData.quantity || 1);
    const countriesAllowed = (() => {
      if (formData.region === "US") return ["US"] as Array<"US" | "IN">;
      if (formData.region === "IN") return ["IN"] as Array<"US" | "IN">;
      return ["US", "IN"] as Array<"US" | "IN">;
    })();
    if (selectedProduct && !selectedVariantId) {
      toast.error("Select a variant for the Shopify product");
      return;
    }
    const products =
      selectedProduct && selectedVariantId
        ? [
            {
              shopifyProductId: selectedProduct.id,
              shopifyVariantId: selectedVariantId,
              quantity: Math.max(1, productQuantity || 1),
            },
          ]
        : [];
    const metadata = {
      productValue: formData.productValue ? Number(formData.productValue) : null,
      category: formData.category || null,
      categoryOther:
        formData.category === "OTHER" ? formData.categoryOther.trim() || null : null,
      description: formData.description || null,
      platforms: formData.platforms,
      platformOther: formData.platforms.includes("OTHER")
        ? formData.platformOther.trim() || null
        : null,
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
    };

    createBrandOffer({
      title,
      template,
      countriesAllowed,
      maxClaims: Number.isFinite(maxClaims) ? maxClaims : 1,
      deadlineDaysAfterDelivery: 14,
      followersThreshold: Number.isFinite(minFollowers) ? minFollowers : 0,
      aboveThresholdAutoAccept: true,
      products,
      metadata,
    })
      .then(() => {
        toast.success("🎮 Campaign launched! Let the matching begin!", {
          description: "Influencers will start seeing your offer.",
        });
        navigate("/brand/campaigns");
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : "Failed to launch campaign";
        toast.error(message);
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/brand/auth";
        }
      });
  };

  const calculateXP = () => {
    let xp = 0;
    formData.contentTypes.forEach(type => {
      xp += contentTypeXp[type] ?? 0;
    });
    return xp * parseInt(formData.quantity || "1");
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

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">SHOPIFY_PRODUCT</Label>
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
                        Connect Shopify to pull product details.
                        <Button
                          asChild
                          size="sm"
                          className="ml-3 bg-primary text-primary-foreground font-pixel text-xs"
                        >
                          <a href={apiUrl("/api/shopify/install")}>CONNECT SHOPIFY</a>
                        </Button>
                      </div>
                    )}
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
                  <div className="space-y-2">
                    <Label className="font-mono text-sm">PLATFORMS</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {availablePlatforms.map((platform) => (
                        <button
                          key={platform.id}
                          onClick={() => toggleArrayField('platforms', platform.id)}
                          className={`p-4 border-2 text-center transition-all pixel-btn ${
                            formData.platforms.includes(platform.id)
                              ? 'border-neon-pink bg-neon-pink/20' 
                              : 'border-border hover:border-neon-pink'
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{platformIcons[platform.id] ?? "✨"}</span>
                          <span className="font-mono text-xs">{platform.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.platforms.includes("OTHER") && (
                    <div className="space-y-2">
                      <Label className="font-mono text-sm">PLATFORM_OTHER</Label>
                      <Input
                        value={formData.platformOther}
                        onChange={(e) => updateField('platformOther', e.target.value)}
                        placeholder="e.g. Snapchat, Pinterest"
                        className="border-2 border-border font-mono focus:border-primary"
                      />
                    </div>
                  )}

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
                  <p className="font-mono text-sm text-muted-foreground mt-2">&gt; Who's your ideal creator?</p>
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
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t-2 border-border">
              <Button 
                variant="outline" 
                onClick={prevStep}
                disabled={currentStep === 1}
                className="border-2 border-border font-pixel text-xs px-6 pixel-btn disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                BACK
              </Button>
              
              {currentStep < 4 ? (
                <Button 
                  onClick={nextStep}
                  className="bg-primary text-primary-foreground font-pixel text-xs px-6 pixel-btn glow-green"
                >
                  NEXT
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleLaunch}
                  className="bg-neon-pink text-background font-pixel text-xs px-8 pixel-btn glow-pink animate-pulse-neon"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  LAUNCH CAMPAIGN
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
