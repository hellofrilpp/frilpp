import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import FrilppLogo from "@/components/FrilppLogo";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ApiError, apiFetch, apiUrl, getAuthMe, logout } from "@/lib/api";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const navItems = [
  { icon: LayoutDashboard, label: "OVERVIEW", href: "/brand/dashboard" },
  { icon: Package, label: "CAMPAIGNS", href: "/brand/campaigns" },
  { icon: Users, label: "PIPELINE", href: "/brand/pipeline" },
  { icon: BarChart3, label: "ANALYTICS", href: "/brand/analytics" },
  { icon: CreditCard, label: "BILLING", href: "/brand/billing" },
  { icon: Settings, label: "SETTINGS", href: "/brand/settings" },
];

const emptyMemberships: Array<{ brandId: string; role: string; brandName: string }> = [];

interface BrandLayoutProps {
  children: React.ReactNode;
}

const BrandLayout = ({ children }: BrandLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const queryClient = useQueryClient();
  const { data: authData, isLoading: authLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: getAuthMe,
  });
  const { data: billingEnabled } = useQuery({
    queryKey: ["billing-enabled"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/billing/config"), { credentials: "include" }).catch(() => null);
      const json = (await res?.json().catch(() => null)) as { enabled?: unknown } | null;
      return Boolean(json?.enabled);
    },
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
  const user = authData?.user ?? null;
  const memberships = user?.memberships ?? emptyMemberships;
  const filteredNavItems =
    billingEnabled === false ? navItems.filter((item) => item.href !== "/brand/billing") : navItems;

  const [gateMode, setGateMode] = useState<"none" | "create" | "select">("none");
  const [gateBrandName, setGateBrandName] = useState("");
  const [gateCountries, setGateCountries] = useState<{ US: boolean; IN: boolean }>({ US: true, IN: true });
  const [gateBrandId, setGateBrandId] = useState<string | null>(null);
  const [gateSubmitting, setGateSubmitting] = useState(false);
  const autoSelectRef = useRef(false);
  const pendingCreateRef = useRef(false);

  const currentPath = useMemo(
    () => `${location.pathname}${location.search || ""}`,
    [location.pathname, location.search],
  );

  const activeMembership = authData?.user?.memberships.find(
    (membership) => membership.brandId === authData.user?.activeBrandId,
  ) ?? authData?.user?.memberships[0];
  const brandName = activeMembership?.brandName ?? "BRAND";
  const brandInitials = brandName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      window.location.href = "/brand/auth";
      return;
    }

    if (!user.tosAcceptedAt || !user.privacyAcceptedAt) {
      window.location.href = apiUrl(`/legal/accept?next=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (user.activeBrandId) {
      setGateMode("none");
      return;
    }

    const pendingName = localStorage.getItem("pendingBrandName");

    if (!memberships.length && pendingName && !pendingCreateRef.current) {
      pendingCreateRef.current = true;
      setGateSubmitting(true);
      apiFetch<{ ok: boolean }>("/api/onboarding/brand", {
        method: "POST",
        body: JSON.stringify({ name: pendingName, countriesDefault: ["US", "IN"] }),
      })
        .then(() => {
          localStorage.removeItem("pendingBrandName");
          queryClient.invalidateQueries({ queryKey: ["auth-me"] });
          window.location.href = "/brand/campaigns/new";
        })
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            window.location.href = "/brand/auth";
            return;
          }
          setGateBrandName(pendingName);
          setGateMode("create");
        })
        .finally(() => setGateSubmitting(false));
      return;
    }

    if (!memberships.length) {
      setGateBrandName(pendingName ?? "");
      setGateMode("create");
      return;
    }

    if (memberships.length === 1) {
      if (autoSelectRef.current) return;
      autoSelectRef.current = true;
      setGateSubmitting(true);
      apiFetch<{ ok: boolean }>("/api/brand/active", {
        method: "POST",
        body: JSON.stringify({ brandId: memberships[0]!.brandId }),
      })
        .then(() => queryClient.invalidateQueries({ queryKey: ["auth-me"] }))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 401) {
            window.location.href = "/brand/auth";
          }
        })
        .finally(() => setGateSubmitting(false));
      return;
    }

    setGateBrandId(memberships[0]?.brandId ?? null);
    setGateMode("select");
  }, [authLoading, currentPath, memberships, queryClient, user]);

  const resolvedCountries = useMemo(() => {
    const next: Array<"US" | "IN"> = [];
    if (gateCountries.US) next.push("US");
    if (gateCountries.IN) next.push("IN");
    return next;
  }, [gateCountries]);

  const blockChildren = gateSubmitting || gateMode !== "none";

  return (
    <div className="min-h-screen bg-background flex">
      <AlertDialog open={gateMode !== "none"}>
        <AlertDialogContent className="border-4 border-border bg-card">
          {gateMode === "create" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-pixel text-sm text-neon-pink">SET UP YOUR BRAND</AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-xs">
                  Create your workspace to start posting offers.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">BRAND NAME</Label>
                  <Input
                    value={gateBrandName}
                    onChange={(e) => setGateBrandName(e.target.value)}
                    placeholder="Awesome Brand Inc."
                    className="border-2 border-border bg-background font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-mono text-xs">COUNTRIES</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 border-2 border-border p-3 bg-background">
                      <Checkbox
                        checked={gateCountries.US}
                        onCheckedChange={(checked) => setGateCountries((prev) => ({ ...prev, US: Boolean(checked) }))}
                      />
                      <span className="font-mono text-xs">United States</span>
                    </label>
                    <label className="flex items-center gap-2 border-2 border-border p-3 bg-background">
                      <Checkbox
                        checked={gateCountries.IN}
                        onCheckedChange={(checked) => setGateCountries((prev) => ({ ...prev, IN: Boolean(checked) }))}
                      />
                      <span className="font-mono text-xs">India</span>
                    </label>
                  </div>
                </div>
              </div>

              <AlertDialogFooter>
                <AlertDialogAction
                  className="font-pixel text-xs bg-neon-pink text-background"
                  disabled={gateSubmitting || gateBrandName.trim().length < 2 || resolvedCountries.length === 0}
                  onClick={async () => {
                    try {
                      setGateSubmitting(true);
                      await apiFetch<{ ok: boolean }>("/api/onboarding/brand", {
                        method: "POST",
                        body: JSON.stringify({ name: gateBrandName.trim(), countriesDefault: resolvedCountries }),
                      });
                      localStorage.removeItem("pendingBrandName");
                      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
                      window.location.href = "/brand/campaigns/new";
                    } catch (err) {
                      if (err instanceof ApiError && err.status === 401) {
                        window.location.href = "/brand/auth";
                        return;
                      }
                    } finally {
                      setGateSubmitting(false);
                    }
                  }}
                >
                  {gateSubmitting ? "CREATING..." : "CONTINUE →"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-pixel text-sm text-neon-yellow">SELECT A BRAND</AlertDialogTitle>
                <AlertDialogDescription className="font-mono text-xs">
                  Choose which workspace you want to manage.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-2">
                {memberships.map((membership) => (
                  <button
                    key={membership.brandId}
                    type="button"
                    onClick={() => setGateBrandId(membership.brandId)}
                    className={cn(
                      "w-full text-left border-2 p-3 transition-colors",
                      gateBrandId === membership.brandId
                        ? "border-neon-green bg-neon-green/10"
                        : "border-border bg-background hover:border-neon-green",
                    )}
                  >
                    <p className="font-pixel text-xs text-foreground">{membership.brandName}</p>
                    <p className="font-mono text-xs text-muted-foreground">{membership.role}</p>
                  </button>
                ))}
              </div>

              <AlertDialogFooter>
                <AlertDialogAction
                  className="font-pixel text-xs bg-neon-yellow text-background"
                  disabled={gateSubmitting || !gateBrandId}
                  onClick={async () => {
                    if (!gateBrandId) return;
                    try {
                      setGateSubmitting(true);
                      await apiFetch<{ ok: boolean }>("/api/brand/active", {
                        method: "POST",
                        body: JSON.stringify({ brandId: gateBrandId }),
                      });
                      await queryClient.invalidateQueries({ queryKey: ["auth-me"] });
                      setGateMode("none");
                      window.location.href = "/brand/dashboard";
                    } catch (err) {
                      if (err instanceof ApiError && err.status === 401) {
                        window.location.href = "/brand/auth";
                      }
                    } finally {
                      setGateSubmitting(false);
                    }
                  }}
                >
                  {gateSubmitting ? "SWITCHING..." : "CONTINUE →"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col border-r-4 border-border bg-card transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b-4 border-border">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary flex items-center justify-center">
                <FrilppLogo size="sm" />
              </div>
              <span className="text-xs font-pixel text-neon-green">
                FRI<span className="text-neon-pink">L</span>PP
              </span>
            </Link>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn("border-2 border-border hover:border-primary", !sidebarOpen && "mx-auto")}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.href || 
              (item.href === "/brand/campaigns" && location.pathname.startsWith("/brand/campaigns"));
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 transition-all border-2",
                  isActive 
                    ? "bg-primary text-primary-foreground border-primary" 
                    : "border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="text-xs font-mono">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t-4 border-border">
          <div className={cn("flex items-center gap-3 p-2", !sidebarOpen && "justify-center")}>
            <div className="w-10 h-10 bg-neon-green text-background flex items-center justify-center text-xs font-pixel">
              {brandInitials || "BR"}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-pixel text-foreground truncate">{brandName}</p>
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-neon-yellow" />
                  <span className="text-xs font-mono text-neon-yellow">LV.8</span>
                </div>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <Button 
              variant="ghost" 
              className="w-full mt-2 justify-start text-muted-foreground border-2 border-transparent hover:border-destructive hover:text-destructive text-xs font-mono"
              onClick={async () => {
                await logout().catch(() => null);
                window.location.href = "/";
              }}
            >
              <span className="inline-flex items-center">
                <LogOut className="w-4 h-4 mr-2" />
                LOG_OUT
              </span>
            </Button>
          )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b-4 border-border z-50 flex items-center px-4">
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="border-2 border-border">
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-6 h-6 bg-primary flex items-center justify-center">
            <FrilppLogo size="sm" />
          </div>
          <span className="text-xs font-pixel text-neon-green">
            FRI<span className="text-neon-pink">L</span>PP
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <AccessibilityToggle />
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/90 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-card border-r-4 border-border" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-4 border-b-4 border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-primary flex items-center justify-center">
                  <FrilppLogo size="sm" />
                </div>
                <span className="text-xs font-pixel text-neon-green">
                  FRI<span className="text-neon-pink">L</span>PP
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="border-2 border-border">
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="p-3 space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 transition-all border-2",
                      isActive 
                        ? "bg-primary text-primary-foreground border-primary" 
                        : "border-transparent hover:border-border text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-mono">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:pt-0 pt-16 overflow-auto bg-background">
        <div className="hidden md:flex items-center justify-end gap-2 px-6 py-3">
          <ThemeToggle />
          <AccessibilityToggle />
        </div>
        {blockChildren ? (
          <div className="p-6">
            <div className="border-4 border-border bg-card p-6 text-center">
              <div className="font-pixel text-sm text-foreground">
                {gateSubmitting ? "SETTING UP…" : "SELECT BRAND…"}
              </div>
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                Finish the dialog to continue.
              </div>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
};

export default BrandLayout;
