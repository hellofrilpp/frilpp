"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_EMAIL = "hello@frilpp.com";

type ApiError = Error & { status?: number; code?: string };

type Notice = { kind: "success" | "error"; text: string };

type AdminMe = {
  ok: boolean;
  user: { id: string; email: string | null; name: string | null; hasPassword: boolean } | null;
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & {
    error?: string;
    code?: string;
  };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<AdminMe>("/api/admin/me");
        if (!cancelled && res.user) {
          router.replace("/idiot/dashboard");
        }
      } catch {
        // not logged in
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const showNotice = (kind: Notice["kind"], text: string) => {
    setNotice({ kind, text });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading) return;
    setIsLoading(true);
    try {
      await fetchJson("/api/admin/auth/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      showNotice("success", "Magic link sent. Check your inbox.");
    } catch (err) {
      const apiErr = err as ApiError;
      const message = apiErr?.message ?? "Login failed";
      showNotice("error", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-10">
        <Card className="w-full border-2 border-border bg-card">
          <CardHeader>
            <div className="mb-4 flex h-12 w-12 items-center justify-center border-2 border-primary bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Admin Access</CardTitle>
            <CardDescription>
              Enter the admin email to receive a magic link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notice ? (
              <div
                className={`mb-4 border-2 px-3 py-2 text-xs font-mono ${
                  notice.kind === "success"
                    ? "border-neon-green text-neon-green"
                    : "border-neon-pink text-neon-pink"
                }`}
              >
                {notice.text}
              </div>
            ) : null}

            {/* Google OAuth Button - Admin only */}
            <div className="mb-6">
              <a
                href="/api/auth/social/google/connect?role=admin&next=/idiot/dashboard"
                className="flex w-full items-center justify-center gap-3 border-2 border-primary bg-primary/10 px-4 py-3 font-mono text-sm hover:bg-primary/20 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
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
                <span>SIGN IN WITH GOOGLE</span>
              </a>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 font-mono text-muted-foreground">OR EMAIL OTP</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-xs font-mono">
                  ADMIN EMAIL
                </Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={ADMIN_EMAIL}
                  required
                  className="border-2 border-border font-mono"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "SENDING LINK..." : "SEND MAGIC LINK"}
              </Button>
            </form>
            <p className="mt-4 text-xs font-mono text-muted-foreground">
              Only {ADMIN_EMAIL} can access the admin dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
