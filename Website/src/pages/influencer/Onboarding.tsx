import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Instagram, ChevronRight, Check, Gamepad2, Sparkles } from "lucide-react";
import FrilppLogo from "@/components/FrilppLogo";
import { ApiError, apiUrl, getPicklists, updateCreatorProfile } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const InfluencerOnboarding = () => {
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesOther, setCategoriesOther] = useState("");
  const [country, setCountry] = useState<"US" | "IN">("US");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: picklists } = useQuery({
    queryKey: ["picklists"],
    queryFn: getPicklists,
  });

  const categories = picklists?.creatorCategories ?? [];
  const needsOther = selectedCategories.includes("OTHER");

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleComplete = async () => {
    try {
      if (needsOther && !categoriesOther.trim()) {
        toast({ title: "ADD DETAILS", description: "Tell us your Other category." });
        return;
      }
      await updateCreatorProfile({
        country,
        categories: selectedCategories,
        categoriesOther: needsOther ? categoriesOther.trim() : null,
      });
      navigate("/influencer/discover");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Onboarding failed";
      toast({ title: "SETUP FAILED", description: message });
      if (err instanceof ApiError && err.status === 401) {
        window.location.href = "/influencer/auth";
      }
      if (err instanceof ApiError && err.code === "NEEDS_LEGAL_ACCEPTANCE") {
        window.location.href = apiUrl("/legal/accept?next=/influencer/onboarding");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid">
      {/* Header */}
      <header className="h-16 border-b-4 border-border flex items-center justify-between px-6 bg-card">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neon-pink flex items-center justify-center">
            <FrilppLogo size="sm" />
          </div>
          <span className="text-xs font-pixel text-neon-green">
            FRI<span className="text-neon-pink">L</span>PP
          </span>
        </Link>
        <span className="text-xs font-pixel text-muted-foreground">STEP {step}/3</span>
      </header>

      {/* Progress Bar */}
      <div className="h-2 bg-muted">
        <div 
          className="h-full bg-neon-green transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 border-4 border-neon-yellow bg-neon-yellow/10 flex items-center justify-center">
                <Gamepad2 className="w-10 h-10 text-neon-yellow animate-bounce-pixel" />
              </div>
              <h1 className="text-xl font-pixel mb-4 text-foreground">WELCOME PLAYER</h1>
              <p className="font-mono text-sm text-muted-foreground mb-8 leading-relaxed">
                &gt; GET FREE PRODUCTS FROM BRANDS<br />
                &gt; CREATE CONTENT YOU LOVE<br />
                <span className="text-neon-green">&gt; SETUP_TIME: 2_MINUTES</span>
              </p>
              <Button 
                onClick={() => setStep(2)}
                className="bg-neon-green text-background font-pixel text-xs px-8 py-6 pixel-btn glow-green"
              >
                START GAME
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Connect Instagram */}
          {step === 2 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-xs font-pixel text-neon-pink">[STEP 2]</span>
                <h1 className="text-xl font-pixel mt-2 text-foreground">CONNECT INSTA</h1>
                <p className="font-mono text-sm text-muted-foreground mt-2">
                  &gt; Verify account & show brands your stats
                </p>
              </div>

              <div className="border-4 border-border p-5 mb-6 bg-card">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 border-2 border-neon-pink bg-neon-pink/10 flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-neon-pink" />
                  </div>
                  <div>
                    <p className="font-pixel text-xs text-foreground">INSTAGRAM</p>
                    <p className="font-mono text-xs text-muted-foreground">Connect main account</p>
                  </div>
                </div>
                <Button
                  asChild
                  className="w-full bg-neon-pink text-background font-pixel text-xs pixel-btn glow-pink"
                >
                  <a href={apiUrl("/api/meta/instagram/connect")}>
                    <Instagram className="w-4 h-4 mr-2" />
                    CONNECT
                  </a>
                </Button>
              </div>

              <div className="space-y-2 font-mono text-xs text-muted-foreground mb-8 p-4 border-2 border-dashed border-border">
                <p className="text-neon-green">✓ READ_ONLY: public profile</p>
                <p className="text-neon-green">✓ NEVER_POST: on your behalf</p>
                <p className="text-neon-green">✓ DISCONNECT: anytime</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-2 border-border font-mono text-xs">
                  BACK
                </Button>
                <Button 
                  onClick={() => setStep(3)}
                  className="flex-1 bg-primary text-primary-foreground font-pixel text-xs pixel-btn"
                >
                  NEXT
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Select Categories */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-xs font-pixel text-neon-purple">[STEP 3]</span>
                <h1 className="text-xl font-pixel mt-2 text-foreground">SELECT NICHE</h1>
                <p className="font-mono text-sm text-muted-foreground mt-2">
                  &gt; Pick categories you create content about
                </p>
              </div>

              <div className="mb-6 border-2 border-border p-4">
                <p className="text-xs font-mono text-muted-foreground mb-3">&gt; Choose your country</p>
                <div className="flex gap-2">
                  {(["US", "IN"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => setCountry(option)}
                      className={`px-3 py-2 border-2 text-xs font-mono transition-all pixel-btn ${
                        country === option
                          ? "border-neon-green bg-neon-green/20 text-neon-green"
                          : "border-border hover:border-neon-green"
                      }`}
                    >
                      {option === "US" ? "UNITED STATES" : "INDIA"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-8">
                {categories.map((category) => {
                  const isSelected = selectedCategories.includes(category.id);
                  return (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id)}
                      className={`p-3 text-xs font-mono text-left border-2 transition-all pixel-btn ${
                        isSelected 
                          ? 'bg-neon-purple text-background border-neon-purple' 
                          : 'border-border hover:border-neon-purple'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category.label}</span>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {needsOther && (
                <div className="mb-6 border-2 border-border p-4">
                  <p className="text-xs font-mono text-muted-foreground mb-3">
                    &gt; Describe your other category
                  </p>
                  <Input
                    value={categoriesOther}
                    onChange={(event) => setCategoriesOther(event.target.value)}
                    placeholder="e.g. Streetwear, Gaming, DIY crafts"
                    className="border-2 border-border font-mono focus:border-neon-purple"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-2 border-border font-mono text-xs">
                  BACK
                </Button>
                <Button 
                  onClick={handleComplete}
                  disabled={selectedCategories.length === 0 || (needsOther && !categoriesOther.trim())}
                  className="flex-1 bg-neon-green text-background font-pixel text-xs pixel-btn glow-green disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  START SWIPING
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InfluencerOnboarding;
