import { createContext, useContext, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export type MarketingMarket = "US" | "IN";

type MarketContextValue = {
  market: MarketingMarket;
  setMarket: (market: MarketingMarket) => void;
  clearMarketOverride: () => void;
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
  const [marketOverride, setMarketOverride] = useState<MarketingMarket | null>(() => {
    try {
      const stored =
        typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      if (stored === "US" || stored === "IN") return stored;
    } catch {
      // ignore
    }
    return null;
  });

  const geoQuery = useQuery({
    queryKey: ["marketing-geo"],
    queryFn: async () => {
      const res = await fetch("/api/geo", { credentials: "include" }).catch(() => null);
      if (!res || !res.ok) return null;
      const json = (await res.json().catch(() => null)) as { market?: unknown } | null;
      const market = json?.market === "IN" ? "IN" : json?.market === "US" ? "US" : null;
      return market;
    },
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  });

  const effectiveMarket = marketOverride ?? geoQuery.data ?? inferDefaultMarket();

  const setMarket = (next: MarketingMarket) => {
    setMarketOverride(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const clearMarketOverride = () => {
    setMarketOverride(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const value = useMemo(
    () => ({ market: effectiveMarket, setMarket, clearMarketOverride }),
    [effectiveMarket],
  );

  return <MarketContext.Provider value={value}>{props.children}</MarketContext.Provider>;
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within MarketProvider");
  }
  return ctx;
}
