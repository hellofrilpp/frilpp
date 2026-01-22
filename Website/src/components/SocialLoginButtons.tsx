import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api";

interface SocialLoginButtonsProps {
  accentColor?: "pink" | "purple" | "green";
  providers?: Array<"tiktok">;
  primaryProvider?: "tiktok";
  primaryVariant?: "outline" | "filled";
  role?: "brand" | "creator";
  nextPath?: string;
  beforeAuth?: (provider: "tiktok") => void;
}

const SocialLoginButtons = ({
  accentColor = "green",
  providers = ["tiktok"],
  primaryProvider,
  primaryVariant = "outline",
  role,
  nextPath,
  beforeAuth,
}: SocialLoginButtonsProps) => {
  const handleSocialLogin = (provider: "tiktok") => {
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

  const totalButtons = providers.length;
  const gridCols = totalButtons <= 1 ? "grid-cols-1" : "grid-cols-2";

  const primary = primaryProvider ?? (providers.length === 1 ? providers[0] : null);

  const primaryClasses = {
    pink: "border-neon-pink bg-neon-pink/8",
    purple: "border-neon-purple bg-neon-purple/6",
    green: "border-neon-green bg-neon-green/10",
  } satisfies Record<typeof accentColor, string>;

  const primaryFilledClasses = {
    pink: "border-neon-pink bg-neon-pink text-background hover:bg-neon-pink/90",
    purple: "border-neon-purple bg-neon-purple text-background hover:bg-neon-purple/90",
    green: "border-neon-green bg-neon-green text-background hover:bg-neon-green/90",
  } satisfies Record<typeof accentColor, string>;

  const primaryButtonClasses =
    primaryVariant === "filled" ? primaryFilledClasses[accentColor] : primaryClasses[accentColor];

  const loginLabel =
    providers.length === 1 && providers[0] === "tiktok" ? "LOGIN WITH TIKTOK" : "LOGIN WITH";

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
        {/* TikTok */}
        {providers.includes("tiktok") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin("tiktok")}
            className={`border-2 border-border bg-background font-mono text-xs transition-all ${accentClasses[accentColor]} ${primary === "tiktok" ? primaryButtonClasses : ""}`}
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
