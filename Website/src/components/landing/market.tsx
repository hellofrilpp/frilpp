import { createContext, useContext, useMemo, useState } from "react";

export type MarketingMarket = "US" | "IN";

type MarketContextValue = {
  market: MarketingMarket;
  setMarket: (market: MarketingMarket) => void;
};

const MarketContext = createContext<MarketContextValue | null>(null);

const STORAGE_KEY = "frilpp:marketing:market";

function inferDefaultMarket(): MarketingMarket {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.includes("Kolkata")) return "IN";
    const lang = (typeof navigator !== "undefined" ? navigator.language : "") ?? "";
    if (lang.toLowerCase().includes("en-in")) return "IN";
  } catch {
    // ignore
  }
  return "US";
}

export function MarketProvider(props: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<MarketingMarket>(() => {
    try {
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored === "US" || stored === "IN") return stored;
    } catch {
      // ignore
    }
    return inferDefaultMarket();
  });

  const setMarket = (next: MarketingMarket) => {
    setMarketState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const value = useMemo(() => ({ market, setMarket }), [market]);

  return <MarketContext.Provider value={value}>{props.children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within MarketProvider");
  }
  return ctx;
}
