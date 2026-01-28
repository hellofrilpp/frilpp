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
