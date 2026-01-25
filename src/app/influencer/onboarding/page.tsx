"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Gamepad2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FrilppLogo from "@/components/frilpp-logo";

type ApiError = Error & { status?: number; code?: string };

type Category = { id: string; label: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export default function InfluencerOnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoriesOther, setCategoriesOther] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ creatorCategories?: Category[] }>("/api/meta/picklists");
        if (!cancelled) setCategories(res.creatorCategories ?? []);
      } catch (err) {
        const apiErr = err as ApiError;
        setNotice(apiErr?.message ?? "Failed to load categories.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const needsOther = useMemo(
    () => selectedCategories.includes("OTHER"),
    [selectedCategories],
  );

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((item) => item !== categoryId) : [...prev, categoryId],
    );
  };

  const handleComplete = async () => {
    if (!selectedCategories.length) {
      setNotice("Pick at least one category.");
      return;
    }
    if (needsOther && !categoriesOther.trim()) {
      setNotice("Tell us your other category.");
      return;
    }
    try {
      await fetchJson("/api/creator/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          categories: selectedCategories,
          categoriesOther: needsOther ? categoriesOther.trim() : null,
        }),
      });
      window.location.href = "/influencer/discover";
    } catch (err) {
      const apiErr = err as ApiError;
      setNotice(apiErr?.message ?? "Onboarding failed");
      if (apiErr?.status === 401) {
        window.location.href = "/influencer/auth";
      }
      if (apiErr?.code === "NEEDS_LEGAL_ACCEPTANCE") {
        window.location.href = "/legal/accept?next=/influencer/onboarding";
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid">
      <header className="h-16 border-b-4 border-border flex items-center justify-between px-6 bg-card">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-neon-pink flex items-center justify-center">
            <FrilppLogo size="sm" />
          </div>
          <span className="text-xs font-pixel text-neon-green">
            FRI<span className="text-neon-pink">L</span>PP
          </span>
        </Link>
        <span className="text-xs font-pixel text-muted-foreground">STEP {step}/2</span>
      </header>

      <div className="h-2 bg-muted">
        <div
          className="h-full bg-neon-green transition-all duration-300"
          style={{ width: `${(step / 2) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {notice ? (
            <div className="mb-4 border-2 border-neon-pink text-neon-pink p-3 text-xs font-mono">
              {notice}
            </div>
          ) : null}

          {step === 1 ? (
            <div className="text-center animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-6 border-4 border-neon-yellow bg-neon-yellow/10 flex items-center justify-center">
                <Gamepad2 className="w-10 h-10 text-neon-yellow animate-bounce-pixel" />
              </div>
              <h1 className="text-xl font-pixel mb-4 text-foreground">WELCOME PLAYER</h1>
              <p className="font-mono text-sm text-muted-foreground mb-8 leading-relaxed">
                &gt; GET FREE PRODUCTS FROM BRANDS
                <br />
                &gt; CREATE CONTENT YOU LOVE
                <br />
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
          ) : null}

          {step === 2 ? (
            <div className="animate-fade-in">
              <div className="text-center mb-8">
                <span className="text-xs font-pixel text-neon-purple">[STEP 2]</span>
                <h1 className="text-xl font-pixel mt-2 text-foreground">SELECT NICHE</h1>
                <p className="font-mono text-sm text-muted-foreground mt-2">
                  &gt; Pick categories you create content about
                </p>
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
                          ? "bg-neon-purple text-background border-neon-purple"
                          : "border-border hover:border-neon-purple"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{category.label}</span>
                        {isSelected ? <Check className="w-4 h-4" /> : null}
                      </div>
                    </button>
                  );
                })}
              </div>

              {needsOther ? (
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
              ) : null}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-2 border-border font-mono text-xs"
                >
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
          ) : null}
        </div>
      </div>
    </div>
  );
}
