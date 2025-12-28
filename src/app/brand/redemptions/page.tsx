"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RedemptionRow = {
  id: string;
  createdAt: string;
  channel: "IN_STORE" | "ONLINE" | "OTHER";
  amountCents: number;
  currency: string;
  note: string | null;
  match: { id: string; campaignCode: string };
  offer: { id: string; title: string };
  creator: { id: string; username: string | null };
};

export default function BrandRedemptionsPage() {
  const [rows, setRows] = useState<RedemptionRow[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/brand/redemptions", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; redemptions: RedemptionRow[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load redemptions",
        );
      }
      setRows(data.redemptions);
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(() => {
    const total = rows.reduce((acc, r) => acc + (Number(r.amountCents) || 0), 0);
    const count = rows.length;
    return { totalCents: total, count };
  }, [rows]);

  async function submit() {
    setIsSaving(true);
    setMessage(null);
    try {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt < 0) {
        throw new Error("Amount must be a number");
      }
      const res = await fetch("/api/brand/redemptions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code,
          amount: amt,
          currency,
          note: note.trim() || undefined,
          channel: "IN_STORE",
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok: true }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to add redemption",
        );
      }
      setCode("");
      setAmount("");
      setNote("");
      setMessage("Recorded.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add redemption");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Brand</Badge>
              <Badge variant="secondary">Redemptions</Badge>
              <Badge variant="secondary">ROI</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">Redemptions</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the creator code customers use at checkout to track local ROI.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brand/analytics">
              <Button variant="outline">Analytics</Button>
            </Link>
            <Link href="/brand/matches">
              <Button variant="outline">Approvals</Button>
            </Link>
            <Link href="/brand/offers/new">
              <Button variant="secondary">New offer</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Home</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Record redemption</CardTitle>
              <CardDescription>Paste the code and amount paid.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  placeholder="FRILP-A1B2C3"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount ({currency})</Label>
                <Input
                  id="amount"
                  placeholder="19.99"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  placeholder="USD"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Note (optional)</Label>
                <Input
                  id="note"
                  placeholder="In-store pickup"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              <Button onClick={submit} disabled={isSaving || !code.trim() || !amount.trim()}>
                {isSaving ? "Saving..." : "Record"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent</CardTitle>
              <CardDescription>
                {status === "loading"
                  ? "Loading…"
                  : status === "error"
                    ? "Failed to load (check DATABASE_URL + migrations)."
                    : `${totals.count} redemptions · Total ${(totals.totalCents / 100).toFixed(2)}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!rows.length ? (
                <div className="text-sm text-muted-foreground">No redemptions yet.</div>
              ) : (
                <div className="grid gap-3">
                  {rows.map((r) => (
                    <div key={r.id} className="rounded-lg border bg-card p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-balance">{r.offer.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            Code: <span className="font-mono text-foreground">{r.match.campaignCode}</span>{" "}
                            · Creator:{" "}
                            <span className="font-mono text-foreground">
                              {r.creator.username ?? r.creator.id}
                            </span>
                          </div>
                          {r.note ? (
                            <div className="mt-2 text-xs text-muted-foreground">{r.note}</div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {(r.amountCents / 100).toFixed(2)} {r.currency}
                          </Badge>
                          <Badge variant="outline">{r.channel}</Badge>
                          <Badge variant="outline">
                            {new Date(r.createdAt).toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

