import { createContext, useContext, useEffect, useMemo } from "react";
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
  // Market is auto-selected via IP (API) with a lightweight local fallback.
  // Any previously-saved manual overrides are cleared to avoid stale UI state.
  useEffect(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

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

  const effectiveMarket = geoQuery.data ?? inferDefaultMarket();

  const setMarket = (next: MarketingMarket) => {
    void next;
  };

  const clearMarketOverride = () => {
    // no-op
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
