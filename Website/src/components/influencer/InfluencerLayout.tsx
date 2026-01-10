import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Compass, 
  Heart, 
  User,
  Menu,
  X,
  LogOut,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import FrilppLogo from "@/components/FrilppLogo";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logout } from "@/lib/api";
import { useAchievements } from "@/hooks/useAchievements";

const navItems = [
  { icon: Compass, label: "DISCOVER", href: "/influencer/discover" },
  { icon: Heart, label: "DEALS", href: "/influencer/deals" },
  { icon: User, label: "PROFILE", href: "/influencer/profile" },
];

interface InfluencerLayoutProps {
  children: React.ReactNode;
}

const InfluencerLayout = ({ children }: InfluencerLayoutProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { level, getTotalXP } = useAchievements();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-16 border-b-4 border-border bg-card flex items-center gap-3 px-4 md:px-6">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-neon-pink flex items-center justify-center">
            <FrilppLogo size="sm" />
          </div>
          <span className="hidden sm:inline text-xs font-pixel text-neon-green">
            FRI<span className="text-neon-pink">L</span>PP
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex flex-1 items-center justify-center gap-1 min-w-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 transition-all text-xs font-mono border-2",
                  isActive 
                    ? "bg-neon-pink text-background border-neon-pink" 
                    : "border-transparent hover:border-neon-pink text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-muted border-2 border-neon-yellow">
            <Trophy className="w-4 h-4 text-neon-yellow" />
            <span className="text-xs font-pixel text-neon-yellow">LV.{level}</span>
            <span className="text-xs font-mono text-foreground">{getTotalXP().toLocaleString()} XP</span>
          </div>
          <ThemeToggle />
          <AccessibilityToggle />
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex border-2 border-transparent hover:border-destructive"
            onClick={async () => {
              await logout().catch(() => null);
              window.location.href = "/";
            }}
          >
            <LogOut className="w-4 h-4" />
          </Button>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden border-2 border-border"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 z-50 bg-background border-t-4 border-border animate-fade-in">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-all border-2 font-mono text-sm",
                    isActive 
                      ? "bg-neon-pink text-background border-neon-pink" 
                      : "border-border hover:border-neon-pink text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="pt-4 border-t-2 border-border">
              <div className="flex items-center gap-2 px-4 py-3">
                <Trophy className="w-5 h-5 text-neon-yellow" />
                <span className="font-pixel text-sm text-neon-yellow">LV.{level}</span>
                <span className="font-mono text-sm">{getTotalXP().toLocaleString()} XP</span>
              </div>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t-4 border-border flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-6 py-2 transition-all",
                isActive ? "text-neon-pink" : "text-muted-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-pixel">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default InfluencerLayout;
