"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSuggestion, reverseGeocode, searchAddress } from "@/lib/location";

type LocationPickerProps = {
  label?: string;
  onSelect: (location: LocationSuggestion) => void;
  showUseMyLocation?: boolean;
};

const LocationPicker = ({
  label = "Address",
  onSelect,
  showUseMyLocation = true,
}: LocationPickerProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setTempMessage = (text: string) => {
    setMessage(text);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAddress(query);
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setTempMessage("Browser location not supported.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const suggestion = await reverseGeocode(latitude, longitude);
        if (!suggestion) {
          setTempMessage("Could not resolve address.");
          return;
        }
        onSelect(suggestion);
        setQuery(suggestion.label);
        setResults([]);
      },
      () => {
        setTempMessage("Enable location permission to use this.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-mono text-xs">{label}</Label>
        {showUseMyLocation ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUseLocation}
            className="border-2 border-border font-mono text-xs"
          >
            USE_MY_LOCATION
          </Button>
        ) : null}
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing your address"
        className="border-2 border-border font-mono"
      />
      {loading ? <p className="text-xs font-mono text-muted-foreground">Searching...</p> : null}
      {message ? <p className="text-xs font-mono text-muted-foreground">{message}</p> : null}
      {results.length > 0 && (
        <div className="border-2 border-border bg-card divide-y-2 divide-border">
          {results.map((result) => (
            <button
              key={`${result.label}-${result.lat}-${result.lng}`}
              type="button"
              className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-muted/60"
              onClick={() => {
                onSelect(result);
                setQuery(result.label);
                setResults([]);
              }}
            >
              {result.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
