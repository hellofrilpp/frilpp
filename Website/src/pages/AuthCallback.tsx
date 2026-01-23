import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FrilppLogo from "@/components/FrilppLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { apiUrl } from "@/lib/api";

 type Status = "loading" | "error";
 type ErrorKey = "missing" | "invalid" | "expired" | "used" | "server" | "default";

 type ErrorContent = {
  key: ErrorKey;
  title: string;
  message: string;
 };

 const errorContent: Record<ErrorKey, ErrorContent> = {
  missing: {
    key: "missing",
    title: "MISSING LINK",
    message: "This sign-in link is missing a token. Request a new link and try again.",
  },
  invalid: {
    key: "invalid",
    title: "INVALID LINK",
    message: "That link is invalid. Please request a fresh sign-in link.",
  },
  expired: {
    key: "expired",
    title: "LINK EXPIRED",
    message: "That link has expired. Request a new sign-in link to continue.",
  },
  used: {
    key: "used",
    title: "LINK USED",
    message: "This link has already been used to sign in. Request a new link if you need another login.",
  },
  server: {
    key: "server",
    title: "SERVER ERROR",
    message: "We hit a server error while signing you in. Try again in a moment.",
  },
  default: {
    key: "default",
    title: "SIGN-IN FAILED",
    message: "We could not sign you in with that link. Please request a new one.",
  },
 };

 function resolveError(code?: string | null, value?: string | null): ErrorContent {
  if (code === "TOKEN_USED") return errorContent.used;
  if (code === "TOKEN_EXPIRED") return errorContent.expired;
  if (code === "TOKEN_INVALID") return errorContent.invalid;

  const raw = value?.toLowerCase() ?? "";
  if (raw.includes("missing")) return errorContent.missing;
  if (raw.includes("used")) return errorContent.used;
  if (raw.includes("expired")) return errorContent.expired;
  if (raw.includes("invalid")) return errorContent.invalid;
  if (raw.includes("database") || raw.includes("server")) return errorContent.server;
  return value ? { ...errorContent.default, message: value } : errorContent.default;
 }

 const AuthCallback = () => {
  const [status, setStatus] = useState<Status>("loading");
  const [errorState, setErrorState] = useState<ErrorContent>(errorContent.default);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(window.location.search);
      const token = hashParams.get("token") ?? searchParams.get("token");
      const errorParam = searchParams.get("error");

      if (token || errorParam) {
        window.history.replaceState({}, document.title, "/auth/callback");
      }

      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setErrorState(resolveError(null, errorParam));
        }
        return;
      }

      try {
        const res = await fetch(apiUrl("/api/auth/callback"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; nextPath?: string }
          | { ok: false; error?: string; code?: string };

        if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
          if (!cancelled) {
            const err = data && "error" in data ? data.error : null;
            const code = data && "code" in data ? data.code : null;
            setStatus("error");
            setErrorState(resolveError(code, err));
          }
          return;
        }

        const nextPath = data.nextPath && data.nextPath.startsWith("/") ? data.nextPath : "/brand/dashboard";
        window.location.href = apiUrl(nextPath);
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          setErrorState(resolveError(null, err instanceof Error ? err.message : null));
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col">
      <header className="p-4 border-b-4 border-primary">
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-primary flex items-center justify-center animate-pulse-neon">
              <FrilppLogo size="sm" />
            </div>
            <span className="text-sm font-pixel text-neon-green tracking-tight">
              FRI<span className="text-neon-pink">L</span>PP
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/brand/auth" className="text-xs font-mono text-muted-foreground hover:text-neon-green">
              BACK
            </Link>
            <ThemeToggle />
            <AccessibilityToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md pixel-border-primary bg-card">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-neon-green/20 border-4 border-neon-green flex items-center justify-center">
              <span className="font-pixel text-neon-green text-lg">AUTH</span>
            </div>
            <CardTitle className="text-xl font-pixel text-portal-green">
              {status === "loading" ? "VERIFYING LINK" : errorState.title}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {status === "loading" ? "Signing you in…" : errorState.message}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "loading" ? (
              <Button className="w-full bg-neon-green text-background font-pixel pixel-btn" disabled>
                CHECKING…
              </Button>
            ) : (
              <>
                <Link to="/brand/auth">
                  <Button className="w-full bg-neon-green text-background font-pixel pixel-btn">
                    GET NEW LINK
                  </Button>
                </Link>
                <Link to="/influencer/auth">
                  <Button variant="outline" className="w-full border-2 border-border font-mono text-xs">
                    OTHER SIGN-IN OPTIONS
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
 };

export default AuthCallback;
