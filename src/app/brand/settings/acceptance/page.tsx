"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AcceptancePolicyPage() {
  const [threshold, setThreshold] = useState(5000);
  const [aboveThresholdAutoAccept, setAboveThresholdAutoAccept] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const example = useMemo(
    () => [
      { followers: 1200, result: "Manual approval" },
      { followers: 4800, result: "Manual approval" },
      { followers: 5000, result: "Auto-accept" },
      { followers: 9000, result: "Auto-accept" },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/brand/settings/acceptance", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; acceptance: { threshold: number; aboveThresholdAutoAccept: boolean } }
        | { ok: false };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) return;
      if (cancelled) return;
      setThreshold(data.acceptance.threshold);
      setAboveThresholdAutoAccept(data.acceptance.aboveThresholdAutoAccept);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setIsSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/brand/settings/acceptance", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threshold, aboveThresholdAutoAccept }),
      });
      if (!res.ok) throw new Error("Save failed");
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setIsSaving(false);
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
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Acceptance policy
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Configure whether claims get auto-accepted or require approval.
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
          <Link href="/brand/settings/instagram">
            <Button variant="secondary">Instagram</Button>
          </Link>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Followers threshold</CardTitle>
            <CardDescription>
              If creator followers are greater than or equal to this number, auto-accept.
              Otherwise, route to manual approval.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Input
                type="number"
                min={0}
                className="sm:max-w-xs"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
              <Button onClick={save} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Above threshold:</span>
              <Button
                size="sm"
                variant={aboveThresholdAutoAccept ? "default" : "outline"}
                onClick={() => setAboveThresholdAutoAccept(true)}
              >
                Auto-accept
              </Button>
              <Button
                size="sm"
                variant={!aboveThresholdAutoAccept ? "default" : "outline"}
                onClick={() => setAboveThresholdAutoAccept(false)}
              >
                Manual review
              </Button>
              {status === "saved" ? <Badge variant="success">Saved</Badge> : null}
              {status === "error" ? <Badge variant="danger">Error</Badge> : null}
            </div>

            <div className="mt-6 rounded-lg border bg-muted p-4">
              <div className="text-xs font-semibold text-muted-foreground">
                Examples (threshold = {threshold})
              </div>
              <div className="mt-3 grid gap-2">
                {example.map((row) => (
                  <div
                    key={row.followers}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="font-mono">{row.followers} followers</span>
                    {aboveThresholdAutoAccept && row.followers >= threshold ? (
                      <Badge variant="success">Auto-accept</Badge>
                    ) : (
                      <Badge variant="outline">Manual approval</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
