import { useState } from "react";
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
import { ApiError, createBrandOffer } from "@/lib/api";

const steps = [
  { id: 1, title: "PRODUCT", icon: Package },
  { id: 2, title: "CONTENT", icon: Camera },
  { id: 3, title: "CRITERIA", icon: Users },
  { id: 4, title: "LAUNCH", icon: Sparkles },
];

const categories = [
  "Skincare", "Makeup", "Fashion", "Fitness", "Food", "Tech", "Home", "Wellness"
];

const platforms = [
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "youtube", name: "YouTube", icon: "▶️" },
];

const contentTypes = [
  { id: "reel", name: "Reel", xp: 50 },
  { id: "story", name: "Story", xp: 20 },
  { id: "post", name: "Feed Post", xp: 40 },
  { id: "review", name: "Review Video", xp: 60 },
];

const CampaignCreator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1 - Product
    productName: "",
    productValue: "",
    category: "",
    description: "",
    productImage: "",
    
    // Step 2 - Content
    platforms: [] as string[],
    contentTypes: [] as string[],
    hashtags: "",
    guidelines: "",
    
    // Step 3 - Criteria
    minFollowers: "1000",
    maxFollowers: "50000",
    niches: [] as string[],
    location: "",
    
    // Step 4 - Review
    campaignName: "",
    quantity: "10",
  });

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
      if (types.includes("reel") && types.includes("story")) return "REEL_PLUS_STORY";
      if (types.includes("reel")) return "REEL";
      if (types.includes("post")) return "FEED";
      return "UGC_ONLY";
    })();

    const title = formData.campaignName || formData.productName;
    if (!title) {
      toast.error("Campaign name required");
      return;
    }

    const minFollowers = Number(formData.minFollowers || 0);
    const maxClaims = Number(formData.quantity || 1);
    const countriesAllowed = (() => {
      const location = formData.location.toLowerCase();
      const countries: Array<"US" | "IN"> = [];
      if (location.includes("india") || location.includes("in")) countries.push("IN");
      if (location.includes("united") || location.includes("usa") || location.includes("us")) countries.push("US");
      return countries.length ? countries : ["US", "IN"];
    })();

    createBrandOffer({
      title,
      template,
      countriesAllowed,
      maxClaims: Number.isFinite(maxClaims) ? maxClaims : 1,
      deadlineDaysAfterDelivery: 14,
      followersThreshold: Number.isFinite(minFollowers) ? minFollowers : 0,
      aboveThresholdAutoAccept: true,
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
      const found = contentTypes.find(ct => ct.id === type);
      if (found) xp += found.xp;
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
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => updateField('category', cat)}
                          className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                            formData.category === cat 
                              ? 'border-primary bg-primary text-primary-foreground' 
                              : 'border-border hover:border-primary'
                          }`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

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
                      {platforms.map(platform => (
                        <button
                          key={platform.id}
                          onClick={() => toggleArrayField('platforms', platform.id)}
                          className={`p-4 border-2 text-center transition-all pixel-btn ${
                            formData.platforms.includes(platform.id)
                              ? 'border-neon-pink bg-neon-pink/20' 
                              : 'border-border hover:border-neon-pink'
                          }`}
                        >
                          <span className="text-2xl mb-2 block">{platform.icon}</span>
                          <span className="font-mono text-xs">{platform.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">CONTENT_TYPES (select multiple)</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {contentTypes.map(type => (
                        <button
                          key={type.id}
                          onClick={() => toggleArrayField('contentTypes', type.id)}
                          className={`p-4 border-2 flex items-center justify-between transition-all pixel-btn ${
                            formData.contentTypes.includes(type.id)
                              ? 'border-neon-green bg-neon-green/20' 
                              : 'border-border hover:border-neon-green'
                          }`}
                        >
                          <span className="font-mono text-sm">{type.name}</span>
                          <span className="font-pixel text-xs text-neon-yellow">+{type.xp}XP</span>
                        </button>
                      ))}
                    </div>
                  </div>

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
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={() => toggleArrayField('niches', cat)}
                          className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                            formData.niches.includes(cat)
                              ? 'border-neon-purple bg-neon-purple/20 text-neon-purple' 
                              : 'border-border hover:border-neon-purple'
                          }`}
                        >
                          {cat.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-mono text-sm">LOCATION (optional)</Label>
                    <Input 
                      value={formData.location}
                      onChange={(e) => updateField('location', e.target.value)}
                      placeholder="e.g. United States, or leave blank for worldwide"
                      className="border-2 border-border font-mono focus:border-primary"
                    />
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
