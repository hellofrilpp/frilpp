import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Building2,
  Bell,
  Link as LinkIcon,
  CreditCard,
  Save,
  Settings
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import BrandLayout from "@/components/brand/BrandLayout";
import LocationPicker from "@/components/LocationPicker";
import {
  ApiError,
  apiUrl,
  getBillingStatus,
  getBrandAcceptanceSettings,
  getBrandNotifications,
  getBrandProfile,
  getSocialAccounts,
  updateBrandAcceptanceSettings,
  updateBrandNotifications,
  updateBrandProfile,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BrandSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    website: "",
    description: "",
    industry: "",
    location: "",
    address1: "",
    address2: "",
    city: "",
    province: "",
    zip: "",
    lat: null as number | null,
    lng: null as number | null,
    logoUrl: "",
  });
  const [acceptanceThreshold, setAcceptanceThreshold] = useState(2000);
  const [autoAccept, setAutoAccept] = useState(true);
  const [notifications, setNotifications] = useState({
    newMatch: true,
    contentReceived: true,
    weeklyDigest: false,
    marketing: false,
  });

  const { data: profileData } = useQuery({
    queryKey: ["brand-profile"],
    queryFn: getBrandProfile,
  });
  const { data: notificationsData } = useQuery({
    queryKey: ["brand-notifications"],
    queryFn: getBrandNotifications,
  });
  const { data: acceptanceData } = useQuery({
    queryKey: ["brand-acceptance"],
    queryFn: getBrandAcceptanceSettings,
  });
  const { data: socialData } = useQuery({
    queryKey: ["social-accounts"],
    queryFn: getSocialAccounts,
  });
  const { data: billingStatus } = useQuery({
    queryKey: ["billing-status"],
    queryFn: getBillingStatus,
  });

  useEffect(() => {
    if (!profileData?.profile) return;
    setProfile({
      name: profileData.profile.name ?? "",
      website: profileData.profile.website ?? "",
      description: profileData.profile.description ?? "",
      industry: profileData.profile.industry ?? "",
      location: profileData.profile.location ?? "",
      address1: profileData.profile.address1 ?? "",
      address2: profileData.profile.address2 ?? "",
      city: profileData.profile.city ?? "",
      province: profileData.profile.province ?? "",
      zip: profileData.profile.zip ?? "",
      lat: profileData.profile.lat ?? null,
      lng: profileData.profile.lng ?? null,
      logoUrl: profileData.profile.logoUrl ?? "",
    });
  }, [profileData]);

  useEffect(() => {
    if (!notificationsData?.notifications) return;
    setNotifications(notificationsData.notifications);
  }, [notificationsData]);

  useEffect(() => {
    if (!acceptanceData?.acceptance) return;
    setAcceptanceThreshold(acceptanceData.acceptance.threshold);
    setAutoAccept(acceptanceData.acceptance.aboveThresholdAutoAccept);
  }, [acceptanceData]);

  const subscribed = billingStatus?.brand?.subscribed ?? false;
  const billingEnabled = billingStatus?.billingEnabled ?? true;

  return (
    <BrandLayout>
      <div className="p-6 md:p-10 max-w-4xl">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-neon-yellow" />
            <span className="text-xs font-pixel text-neon-yellow">[SETTINGS]</span>
          </div>
          <h1 className="text-xl md:text-2xl font-pixel text-foreground">CONFIG</h1>
          <p className="font-mono text-sm text-muted-foreground mt-1">&gt; Manage account preferences</p>
        </div>

        {/* Brand Profile */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <Building2 className="w-5 h-5 text-neon-green" />
            <h2 className="font-pixel text-sm text-neon-green">[BRAND_PROFILE]</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-neon-green text-background flex items-center justify-center text-xl font-pixel">
                {profile.name
                  ? profile.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                  : "BR"}
              </div>
              <div className="flex-1">
                <Button variant="outline" size="sm" className="border-2 border-border font-mono text-xs">
                  CHANGE_LOGO
                </Button>
                <p className="text-xs font-mono text-muted-foreground mt-2">JPG, PNG, SVG. Max 2MB.</p>
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">BRAND_NAME</Label>
                <Input
                  value={profile.name}
                  onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">WEBSITE</Label>
                <Input
                  type="url"
                  value={profile.website}
                  onChange={(event) => setProfile((prev) => ({ ...prev, website: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <div>
              <Label className="font-mono text-xs">DESCRIPTION</Label>
              <Textarea 
                value={profile.description}
                onChange={(event) => setProfile((prev) => ({ ...prev, description: event.target.value }))}
                className="mt-2 border-2 border-border font-mono"
                rows={3}
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">INDUSTRY</Label>
                <Input
                  value={profile.industry}
                  onChange={(event) => setProfile((prev) => ({ ...prev, industry: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>

            <LocationPicker
              label="Address"
              showUseMyLocation={false}
              onSelect={(location) =>
                setProfile((prev) => ({
                  ...prev,
                  location: location.label,
                  address1: location.address1,
                  city: location.city,
                  province: location.province,
                  zip: location.zip,
                  lat: location.lat,
                  lng: location.lng,
                }))
              }
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">ADDRESS_LINE_1</Label>
                <Input
                  value={profile.address1}
                  onChange={(event) => setProfile((prev) => ({ ...prev, address1: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
              <div>
                <Label className="font-mono text-xs">ADDRESS_LINE_2</Label>
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

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label className="font-mono text-xs">LOGO_URL</Label>
                <Input
                  type="url"
                  value={profile.logoUrl}
                  onChange={(event) => setProfile((prev) => ({ ...prev, logoUrl: event.target.value }))}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Social Accounts */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-neon-purple" />
            <h2 className="font-pixel text-sm text-neon-purple">[SOCIAL_LINKS]</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-3">
              {(["TIKTOK"] as const).map((provider) => {
                const connected = socialData?.accounts?.some(
                  (account) => account.provider === provider,
                );
                const label = "TikTok";
                return (
                  <div key={provider} className="flex items-center justify-between border-2 border-border p-4">
                    <div>
                      <p className="font-mono text-xs text-muted-foreground">{label}</p>
                      <p className="font-pixel text-xs text-foreground">
                        {connected ? "CONNECTED" : "NOT_CONNECTED"}
                      </p>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      className="bg-neon-purple text-background font-pixel text-xs pixel-btn"
                    >
                      <a
                        href={apiUrl(
                          `/api/auth/social/${provider.toLowerCase()}/connect?role=brand&next=/brand/settings`,
                        )}
                      >
                        {connected ? "RECONNECT" : "CONNECT"}
                      </a>
                    </Button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs font-mono text-muted-foreground">
              Link your TikTok to verify your official channel.
            </p>
          </div>
        </section>

        {/* Notifications */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <Bell className="w-5 h-5 text-neon-pink" />
            <h2 className="font-pixel text-sm text-neon-pink">[NOTIFICATIONS]</h2>
          </div>
          <div className="divide-y-2 divide-border">
            {[
              { key: "newMatch", label: "NEW_MATCH_ALERTS", description: "Get notified when creators swipe right" },
              { key: "contentReceived", label: "CONTENT_RECEIVED", description: "Notified when content is submitted" },
              { key: "weeklyDigest", label: "WEEKLY_DIGEST", description: "Weekly campaign performance summary" },
              { key: "marketing", label: "MARKETING", description: "Tips, updates, and offers" },
            ].map((item) => (
              <div key={item.key} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-mono text-sm">{item.label}</p>
                  <p className="text-xs font-mono text-muted-foreground">{item.description}</p>
                </div>
                <Switch
                  checked={notifications[item.key as keyof typeof notifications]}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </section>

        {/* Acceptance Rules */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <Settings className="w-5 h-5 text-neon-blue" />
            <h2 className="font-pixel text-sm text-neon-blue">[AUTO_ACCEPT]</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <Label className="font-mono text-xs">FOLLOWER_THRESHOLD</Label>
              <Input
                type="number"
                min={0}
                value={acceptanceThreshold}
                onChange={(event) => setAcceptanceThreshold(Number(event.target.value))}
                className="mt-2 border-2 border-border font-mono"
              />
            </div>
            <div className="flex items-center justify-between p-4 border-2 border-border">
              <div>
                <p className="font-mono text-sm">AUTO_ACCEPT_ABOVE_THRESHOLD</p>
                <p className="text-xs font-mono text-muted-foreground">
                  If enabled, creators above the threshold auto-approve.
                </p>
              </div>
              <Switch checked={autoAccept} onCheckedChange={setAutoAccept} />
            </div>
          </div>
        </section>

        {/* Billing */}
        {billingEnabled ? (
          <section className="mb-8 border-4 border-border bg-card">
            <div className="p-4 border-b-4 border-border flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-neon-yellow" />
              <h2 className="font-pixel text-sm text-neon-yellow">[BILLING]</h2>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-pixel text-sm text-neon-green">GROWTH_PLAN</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {subscribed ? "ACTIVE" : "NOT_SUBSCRIBED"}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-2 border-border font-mono text-xs"
                >
                  <Link to="/brand/billing">{subscribed ? "MANAGE" : "SUBSCRIBE"}</Link>
                </Button>
              </div>
              <div className="p-3 bg-muted border-2 border-border">
                <p className="text-xs font-mono">
                  <span className="text-neon-green">STATUS:</span>{" "}
                  {subscribed ? "UNLOCKED" : "LOCKED"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-8 pixel-btn glow-green"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                const payload = {
                  ...profile,
                };
                await updateBrandProfile(payload);
                await updateBrandNotifications(notifications);
                await updateBrandAcceptanceSettings({
                  threshold: acceptanceThreshold,
                  aboveThresholdAutoAccept: autoAccept,
                });
                await queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
                await queryClient.invalidateQueries({ queryKey: ["brand-notifications"] });
                await queryClient.invalidateQueries({ queryKey: ["brand-acceptance"] });
                toast({ title: "SAVED", description: "Settings updated." });
              } catch (err) {
                const message = err instanceof ApiError ? err.message : "Failed to save settings";
                toast({ title: "SAVE FAILED", description: message });
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "SAVING..." : "SAVE_CHANGES"}
          </Button>
        </div>
      </div>
    </BrandLayout>
  );
};

export default BrandSettings;
