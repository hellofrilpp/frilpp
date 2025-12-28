"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function InstagramSettingsPage() {
  const [handle, setHandle] = useState("");
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/brand/settings/instagram", { method: "GET" });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; instagramHandle: string | null }
          | { ok: false };
        if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Failed");
        if (cancelled) return;
        setHandle(data.instagramHandle ?? "");
        setStatus("idle");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/brand/settings/instagram", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ instagramHandle: handle }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) throw new Error("Failed");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Settings</Badge>
              <Badge variant="secondary">Instagram</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Instagram handle
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Used to verify that creators mention your handle in captions when required.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/brand/settings/profile">
              <Button variant="outline">Profile</Button>
            </Link>
            <Link href="/brand/settings/acceptance">
              <Button variant="outline">Acceptance</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Handle</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "saving"
                  ? "Saving…"
                  : status === "saved"
                    ? "Saved."
                    : status === "error"
                      ? "Error (check auth + DB)."
                      : "Example: frilpp"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="handle">Instagram handle</Label>
              <Input
                id="handle"
                placeholder="brandhandle"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
              />
            </div>
            <Button onClick={save} disabled={status === "saving" || !handle.trim()}>
              Save
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
