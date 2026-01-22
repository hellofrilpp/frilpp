import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import FrilppLogo from "@/components/FrilppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import LocationPicker from "@/components/LocationPicker";
import { useToast } from "@/hooks/use-toast";
import {
  ApiError,
  createBrandWorkspace,
  getAuthMe,
  getBrandProfile,
  setPassword,
  updateBrandProfile,
} from "@/lib/api";

const BrandSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") || "signup";
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    location: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    country: "US" as "US" | "IN",
    lat: null as number | null,
    lng: null as number | null,
  });
  const [brandName, setBrandName] = useState("");
  const [countriesDefault, setCountriesDefault] = useState<Array<"US" | "IN">>(["US"]);
  const [password, setPasswordValue] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasBrand, setHasBrand] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const me = await getAuthMe();
        if (!me.user) {
          if (!cancelled) navigate("/brand/auth");
          return;
        }
        const hasMembership = Boolean(me.user.memberships?.length);
        if (cancelled) return;
        setHasBrand(hasMembership);
        if (hasMembership) {
          const profileRes = await getBrandProfile();
          if (cancelled) return;
          setProfile({
            name: profileRes.profile.name ?? "",
            location: profileRes.profile.location ?? "",
            address1: profileRes.profile.address1 ?? "",
            address2: profileRes.profile.address2 ?? "",
            city: profileRes.profile.city ?? "",
            province: profileRes.profile.province ?? "",
            zip: profileRes.profile.zip ?? "",
            country: (profileRes.profile.country as "US" | "IN") ?? "US",
            lat: profileRes.profile.lat ?? null,
            lng: profileRes.profile.lng ?? null,
          });
        }
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          navigate("/brand/auth");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const locationReady = useMemo(() => {
    return Boolean(profile.lat !== null && profile.lng !== null && profile.country);
  }, [profile.lat, profile.lng, profile.country]);

  const needsLocation = !locationReady;

  const handleSave = async () => {
    if (saving) return;
    if (password.trim().length < 8) {
      toast({ title: "PASSWORD", description: "Use at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "PASSWORD", description: "Passwords do not match." });
      return;
    }
    if (!hasBrand && !brandName.trim()) {
      toast({ title: "BRAND NAME", description: "Enter your brand name." });
      return;
    }
    if (needsLocation) {
      toast({ title: "LOCATION", description: "Select your brand location." });
      return;
    }

    setSaving(true);
    try {
      if (!hasBrand) {
        await createBrandWorkspace({ name: brandName.trim(), countriesDefault });
      }

      await updateBrandProfile({
        name: hasBrand ? profile.name || undefined : brandName.trim(),
        location: profile.location || undefined,
        address1: profile.address1 || undefined,
        address2: profile.address2 || undefined,
        city: profile.city || undefined,
        province: profile.province || undefined,
        zip: profile.zip || undefined,
        country: profile.country || undefined,
        lat: profile.lat ?? null,
        lng: profile.lng ?? null,
      });

      await setPassword(password);

      toast({ title: "SETUP COMPLETE", description: "Welcome to Frilpp." });
      navigate("/brand/dashboard");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Setup failed";
      toast({ title: "FAILED", description: message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background bg-grid flex flex-col">
        <header className="p-4 border-b-4 border-primary">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
                <FrilppLogo size="sm" />
              </div>
              <span className="text-sm font-pixel text-neon-green tracking-tight">
                FRI<span className="text-neon-pink">L</span>PP
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <AccessibilityToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
            Loading setup...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <header className="p-4 border-b-4 border-primary">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-3xl mx-auto w-full">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-5 h-5 text-neon-green" />
            <span className="text-xs font-pixel text-neon-green">[SECURE_SETUP]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel">{mode === "reset" ? "RESET PASSWORD" : "FINISH SETUP"}</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            {mode === "reset"
              ? "Set a new password and confirm your location."
              : "Create a password and confirm your location to launch campaigns."}
          </p>
        </div>

        <Card className="mb-6 border-4 border-neon-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-neon-green" /> Brand details
            </CardTitle>
            <CardDescription>We use this for local matching and delivery routing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasBrand ? (
              <div className="space-y-4">
                <div>
                  <Label className="font-mono text-xs">BRAND NAME</Label>
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    className="mt-2 border-2 border-border font-mono"
                    placeholder="Awesome Brand Inc."
                  />
                </div>
                <div>
                  <Label className="font-mono text-xs">DEFAULT COUNTRIES</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["US", "IN"] as const).map((cc) => {
                      const active = countriesDefault.includes(cc);
                      return (
                        <Button
                          key={cc}
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() =>
                            setCountriesDefault((prev) =>
                              active ? prev.filter((c) => c !== cc) : [...prev, cc],
                            )
                          }
                        >
                          {cc === "US" ? "United States" : "India"}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">LOCATION</Label>
                <Input
                  value={profile.location}
                  onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">COUNTRY</Label>
                <Input
                  value={profile.country}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      country: event.target.value === "IN" ? "IN" : "US",
                    }))
                  }
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <LocationPicker
              label="AUTO_FILL_ADDRESS"
              onSelect={(location) =>
                setProfile((prev) => ({
                  ...prev,
                  location: location.label,
                  address1: location.address1,
                  city: location.city,
                  province: location.province,
                  zip: location.zip,
                  country: location.country ?? prev.country,
                  lat: location.lat,
                  lng: location.lng,
                }))
              }
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">ADDRESS LINE 1</Label>
                <Input
                  value={profile.address1}
                  onChange={(event) => setProfile((prev) => ({ ...prev, address1: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ADDRESS LINE 2</Label>
                <Input
                  value={profile.address2}
                  onChange={(event) => setProfile((prev) => ({ ...prev, address2: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="font-mono text-xs">CITY</Label>
                <Input
                  value={profile.city}
                  onChange={(event) => setProfile((prev) => ({ ...prev, city: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">STATE</Label>
                <Input
                  value={profile.province}
                  onChange={(event) => setProfile((prev) => ({ ...prev, province: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ZIP</Label>
                <Input
                  value={profile.zip}
                  onChange={(event) => setProfile((prev) => ({ ...prev, zip: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {locationReady ? "Location locked." : "Pick a location to enable radius matching."}
            </div>
          </CardContent>
        </Card>

        <Card className="border-4 border-neon-yellow">
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Use at least 8 characters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="font-mono text-xs">PASSWORD</Label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPasswordValue(event.target.value)}
                className="mt-2 border-2 border-border font-mono"
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="font-mono text-xs">CONFIRM PASSWORD</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 border-2 border-border font-mono"
                placeholder="••••••••"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-neon-green text-background font-pixel pixel-btn"
          >
            {saving ? "SAVING..." : "FINISH SETUP"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default BrandSetup;
