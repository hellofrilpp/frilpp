import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const Onboarding = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const nextPath = searchParams.get("next") || "";
    const safeNext =
      nextPath.startsWith("/brand/") || nextPath.startsWith("/influencer/") ? nextPath : null;

    if (safeNext?.startsWith("/brand/")) {
      window.location.replace(safeNext);
      return;
    }

    if (safeNext?.startsWith("/influencer/")) {
      window.location.replace("/influencer/onboarding");
      return;
    }

    window.location.replace("/brand/dashboard");
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="border-4 border-border bg-card p-6 text-center">
        <div className="font-pixel text-sm text-foreground">REDIRECTING…</div>
        <div className="mt-2 text-xs font-mono text-muted-foreground">
          Taking you to setup.
        </div>
      </div>
    </div>
  );
};

export default Onboarding;

