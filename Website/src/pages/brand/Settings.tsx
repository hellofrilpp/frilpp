import { useEffect, useState } from "react";
import { 
  Building2,
  Bell,
  Link as LinkIcon,
  CreditCard,
  Save,
  Settings,
  ShoppingBag,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import BrandLayout from "@/components/brand/BrandLayout";
import {
  ApiError,
  apiUrl,
  getBrandAcceptanceSettings,
  getBrandInstagramHandle,
  getBrandNotifications,
  getBrandProfile,
  getShopifyStatus,
  updateBrandAcceptanceSettings,
  updateBrandInstagramHandle,
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
    logoUrl: "",
  });
  const [instagramHandle, setInstagramHandle] = useState("");
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
  const { data: instagramData } = useQuery({
    queryKey: ["brand-instagram"],
    queryFn: getBrandInstagramHandle,
  });
  const { data: shopifyStatus } = useQuery({
    queryKey: ["shopify-status"],
    queryFn: getShopifyStatus,
  });

  useEffect(() => {
    if (!profileData?.profile) return;
    setProfile({
      name: profileData.profile.name ?? "",
      website: profileData.profile.website ?? "",
      description: profileData.profile.description ?? "",
      industry: profileData.profile.industry ?? "",
      location: profileData.profile.location ?? "",
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

  useEffect(() => {
    if (!instagramData) return;
    setInstagramHandle(instagramData.instagramHandle ?? "");
  }, [instagramData]);

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
              <div>
                <Label className="font-mono text-xs">LOCATION</Label>
                <Input
                  value={profile.location}
                  onChange={(event) => setProfile((prev) => ({ ...prev, location: event.target.value }))}
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
              <div>
                <Label className="font-mono text-xs">INSTAGRAM_HANDLE</Label>
                <Input
                  value={instagramHandle}
                  onChange={(event) => setInstagramHandle(event.target.value)}
                  className="mt-2 border-2 border-border font-mono"
                />
              </div>
            </div>
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

        {/* Integrations */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <LinkIcon className="w-5 h-5 text-neon-purple" />
            <h2 className="font-pixel text-sm text-neon-purple">[INTEGRATIONS]</h2>
          </div>
          <div className="divide-y-2 divide-border">
            <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border-2 border-neon-green bg-neon-green/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-neon-green" />
                </div>
                <div>
                  <p className="font-mono text-sm">SHOPIFY</p>
                  <p className="text-xs font-mono text-muted-foreground">Sync products and inventory</p>
                </div>
              </div>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="border-2 border-primary text-primary font-mono text-xs"
              >
                <a href={apiUrl("/api/shopify/install")}>
                  {shopifyStatus?.connected ? "RECONNECT" : "CONNECT"}
                </a>
              </Button>
            </div>
            <div className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 border-2 border-neon-yellow bg-neon-yellow/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-neon-yellow" />
                </div>
                <div>
                  <p className="font-mono text-sm">SHIPSTATION</p>
                  <p className="text-xs font-mono text-muted-foreground">Automated shipping labels</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="border-2 border-primary text-primary font-mono text-xs">
                CONNECT
              </Button>
            </div>
          </div>
        </section>

        {/* Billing */}
        <section className="mb-8 border-4 border-border bg-card">
          <div className="p-4 border-b-4 border-border flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-neon-yellow" />
            <h2 className="font-pixel text-sm text-neon-yellow">[BILLING]</h2>
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-pixel text-sm text-neon-green">GROWTH_PLAN</p>
                <p className="text-xs font-mono text-muted-foreground">$99/month · Renews Jan 15, 2025</p>
              </div>
              <Button variant="outline" size="sm" className="border-2 border-border font-mono text-xs">
                MANAGE
              </Button>
            </div>
            <div className="p-3 bg-muted border-2 border-border">
              <p className="text-xs font-mono">
                <span className="text-neon-green">USAGE:</span> 45 matches // UNLIMITED
              </p>
            </div>
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-pixel text-xs px-8 pixel-btn glow-green"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await updateBrandProfile(profile);
                await updateBrandNotifications(notifications);
                await updateBrandAcceptanceSettings({
                  threshold: acceptanceThreshold,
                  aboveThresholdAutoAccept: autoAccept,
                });
                await updateBrandInstagramHandle(instagramHandle.trim());
                await queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
                await queryClient.invalidateQueries({ queryKey: ["brand-notifications"] });
                await queryClient.invalidateQueries({ queryKey: ["brand-acceptance"] });
                await queryClient.invalidateQueries({ queryKey: ["brand-instagram"] });
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
