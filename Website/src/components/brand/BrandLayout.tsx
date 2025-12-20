import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  BarChart3, 
  Settings,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FrilppLogo from "@/components/FrilppLogo";
import { ApiError, apiFetch, apiUrl } from "@/lib/api";

const navItems = [
  { icon: LayoutDashboard, label: "OVERVIEW", href: "/brand/dashboard" },
  { icon: Package, label: "CAMPAIGNS", href: "/brand/campaigns" },
  { icon: Users, label: "PIPELINE", href: "/brand/pipeline" },
  { icon: BarChart3, label: "ANALYTICS", href: "/brand/analytics" },
  { icon: Settings, label: "SETTINGS", href: "/brand/settings" },
];

interface BrandLayoutProps {
  children: React.ReactNode;
}

const BrandLayout = ({ children }: BrandLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const ensureSession = async () => {
      try {
        await apiFetch<{ ok: boolean; activeBrandId: string | null }>("/api/brand/active");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          window.location.href = "/brand/auth";
        }
        if (err instanceof ApiError && err.code === "NEEDS_LEGAL_ACCEPTANCE") {
          window.location.href = apiUrl("/legal/accept?next=/brand/dashboard");
        }
      }
    };

    ensureSession();

    const pendingName = localStorage.getItem("pendingBrandName");
    if (!pendingName) return;

    const ensureBrand = async () => {
      try {
        const active = await apiFetch<{ ok: boolean; activeBrandId: string | null }>(
          "/api/brand/active",
        );
        if (active.activeBrandId) {
          localStorage.removeItem("pendingBrandName");
          return;
        }

        await apiFetch<{ ok: boolean }>("/api/onboarding/brand", {
          method: "POST",
          body: JSON.stringify({ name: pendingName, countriesDefault: ["US", "IN"] }),
        });
        localStorage.removeItem("pendingBrandName");
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        if (err instanceof ApiError && err.code === "NEEDS_LEGAL_ACCEPTANCE") {
          window.location.href = apiUrl("/legal/accept?next=/brand/dashboard");
        }
      }
    };

    ensureBrand();
  }, []);

  return (
    <div className="min-h-screen bg-background flex">
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
          {navItems.map((item) => {
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
              GB
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-pixel text-foreground truncate">GLOWUP</p>
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
              asChild
            >
              <Link to="/">
                <LogOut className="w-4 h-4 mr-2" />
                LOG_OUT
              </Link>
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
              {navItems.map((item) => {
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
        {children}
      </main>
    </div>
  );
};

export default BrandLayout;
