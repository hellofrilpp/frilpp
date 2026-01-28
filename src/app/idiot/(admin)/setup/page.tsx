"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ADMIN_EMAIL = "hello@frilpp.com";

type ApiError = Error & { status?: number; code?: string };

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  const data = (await res.json().catch(() => null)) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data?.error ?? "Request failed") as ApiError;
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

export default function AdminSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJson<{ ok: boolean; user: { email: string | null; hasPassword: boolean } }>(
          "/api/admin/me",
        );
        if (cancelled) return;
        if (!res.user || res.user.email?.toLowerCase() !== ADMIN_EMAIL) {
          router.replace("/idiot");
          return;
        }
        setHasPassword(Boolean(res.user.hasPassword));
      } catch {
        if (!cancelled) router.replace("/idiot");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleSave = async () => {
    if (saving) return;
    if (password.trim().length < 8) {
      showNotice("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      showNotice("Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      await fetchJson("/api/auth/password/set", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      router.replace("/idiot/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      showNotice(apiErr?.message ?? "Failed to set password.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="border-2 border-border bg-card p-6 text-xs font-mono text-muted-foreground">
        Loading admin setup...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <span className="text-xs font-mono text-muted-foreground">ADMIN SETUP</span>
      </div>
      <div>
        <h1 className="text-xl font-semibold">Set admin password</h1>
        <p className="text-sm text-muted-foreground">
          Save a password for {ADMIN_EMAIL} after verifying the magic link.
        </p>
      </div>

      {notice ? (
        <div className="border-2 border-neon-pink px-4 py-3 text-xs font-mono text-neon-pink">
          {notice}
        </div>
      ) : null}

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Use at least 8 characters.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-mono">PASSWORD</Label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="border-2 border-border font-mono"
              placeholder="********"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-mono">CONFIRM PASSWORD</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="border-2 border-border font-mono"
              placeholder="********"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "SAVING..." : "SAVE PASSWORD"}
            </Button>
            {hasPassword ? (
              <Button variant="outline" onClick={() => router.push("/idiot/dashboard")}> 
                Skip to dashboard
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
