import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LocationSuggestion, reverseGeocode, searchAddress } from "@/lib/location";

type LocationPickerProps = {
  label?: string;
  onSelect: (location: LocationSuggestion) => void;
};

const LocationPicker = ({ label = "LOCATION_SEARCH", onSelect }: LocationPickerProps) => {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

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
      toast({ title: "LOCATION UNAVAILABLE", description: "Browser location not supported." });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const suggestion = await reverseGeocode(latitude, longitude);
        if (!suggestion) {
          toast({ title: "NOT FOUND", description: "Could not resolve address." });
          return;
        }
        onSelect(suggestion);
        setQuery(suggestion.label);
        setResults([]);
      },
      () => {
        toast({ title: "LOCATION BLOCKED", description: "Enable location permission to use this." });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-mono text-xs">{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUseLocation}
          className="border-2 border-border font-mono text-xs"
        >
          USE_MY_LOCATION
        </Button>
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Start typing your address"
        className="border-2 border-border font-mono"
      />
      {loading && <p className="text-xs font-mono text-muted-foreground">Searching...</p>}
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
