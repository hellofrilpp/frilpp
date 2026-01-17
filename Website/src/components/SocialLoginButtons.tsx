import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";

interface SocialLoginButtonsProps {
  accentColor?: "pink" | "purple" | "green";
  showGoogle?: boolean;
  providers?: Array<"instagram" | "tiktok">;
  primaryProvider?: "instagram" | "tiktok";
  role?: "brand" | "creator";
  nextPath?: string;
  beforeAuth?: (provider: "instagram" | "tiktok") => void;
}

const SocialLoginButtons = ({
  accentColor = "green",
  showGoogle = false,
  providers = ["instagram", "tiktok"],
  primaryProvider,
  role,
  nextPath,
  beforeAuth,
}: SocialLoginButtonsProps) => {
  const handleSocialLogin = (provider: "instagram" | "tiktok") => {
    beforeAuth?.(provider);
    const params = new URLSearchParams();
    if (role) params.set("role", role);
    if (nextPath) params.set("next", nextPath);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    window.location.href = apiUrl(`/api/auth/social/${provider}/connect${suffix}`);
  };

  const accentClasses = {
    pink: "hover:border-neon-pink hover:text-neon-pink",
    purple: "hover:border-neon-purple hover:text-neon-purple",
    green: "hover:border-neon-green hover:text-neon-green",
  };

  const totalButtons = providers.length + (showGoogle ? 1 : 0);
  const gridCols =
    totalButtons <= 1 ? "grid-cols-1" : totalButtons === 2 ? "grid-cols-2" : "grid-cols-3";

  const primary = primaryProvider ?? (providers.length === 1 ? providers[0] : null);

  const primaryClasses = {
    pink: "border-neon-pink bg-neon-pink/8",
    purple: "border-neon-purple bg-neon-purple/6",
    green: "border-neon-green bg-neon-green/10",
  } satisfies Record<typeof accentColor, string>;

  const loginLabel = (() => {
    if (showGoogle) return "OR CONTINUE WITH";
    if (providers.length === 1 && providers[0] === "tiktok") return "LOGIN WITH TIKTOK";
    if (providers.length === 1 && providers[0] === "instagram") return "LOGIN WITH INSTA";
    return "LOGIN WITH";
  })();

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-card px-2 font-mono text-muted-foreground">
            {loginLabel}
          </span>
        </div>
      </div>

      <div className={`grid ${gridCols} gap-2`}>
        {/* Google - only shown for brands */}
        {showGoogle && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("Google")}
            className={`border-2 border-border bg-background font-mono text-xs transition-all ${accentClasses[accentColor]}`}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            GOOGLE
          </Button>
        )}

        {/* Instagram */}
        {providers.includes("instagram") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("instagram")}
            className={`border-2 border-border bg-background font-mono text-xs transition-all ${accentClasses[accentColor]} ${primary === "instagram" ? primaryClasses[accentColor] : ""}`}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            INSTA
          </Button>
        )}

        {/* TikTok */}
        {providers.includes("tiktok") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("tiktok")}
            className={`border-2 border-border bg-background font-mono text-xs transition-all ${accentClasses[accentColor]} ${primary === "tiktok" ? primaryClasses[accentColor] : ""}`}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
            TIKTOK
          </Button>
        )}
      </div>
    </div>
  );
};

export default SocialLoginButtons;
