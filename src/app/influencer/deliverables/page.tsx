"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUsageRightsScope } from "@/lib/usage-rights";

type Row = {
  deliverableId: string;
  status: string;
  expectedType: string;
  dueAt: string;
  submittedPermalink: string | null;
  submittedNotes: string | null;
  usageRightsGrantedAt: string | null;
  usageRightsScope: string | null;
  verifiedPermalink: string | null;
  failureReason: string | null;
  match: { id: string; campaignCode: string };
  offer: { title: string; usageRightsRequired: boolean; usageRightsScope: string | null };
  brand: { name: string };
};

export default function CreatorDeliverablesPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [draftByMatchId, setDraftByMatchId] = useState<Record<string, string>>({});
  const [notesByMatchId, setNotesByMatchId] = useState<Record<string, string>>({});
  const [rightsByMatchId, setRightsByMatchId] = useState<Record<string, boolean>>({});

  async function load() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/creator/deliverables", { method: "GET" });
      const data = (await res.json().catch(() => null)) as
        | { ok: true; deliverables: Row[] }
        | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string"
            ? data.error
            : "Failed to load",
        );
      }
      setRows(data.deliverables);
      setDraftByMatchId((prev) => {
        const next = { ...prev };
        for (const r of data.deliverables) {
          if (r.submittedPermalink && !next[r.match.id]) next[r.match.id] = r.submittedPermalink;
        }
        return next;
      });
      setNotesByMatchId((prev) => {
        const next = { ...prev };
        for (const r of data.deliverables) {
          if (r.submittedNotes && !next[r.match.id]) next[r.match.id] = r.submittedNotes;
        }
        return next;
      });
      setRightsByMatchId((prev) => {
        const next = { ...prev };
        for (const r of data.deliverables) {
          if (typeof next[r.match.id] !== "boolean") {
            next[r.match.id] = Boolean(r.usageRightsGrantedAt);
          }
        }
        return next;
      });
      setStatus("idle");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dueCount = useMemo(() => rows.filter((r) => r.status === "DUE").length, [rows]);

  async function submit(matchId: string) {
    setMessage(null);
    try {
      const url = (draftByMatchId[matchId] ?? "").trim();
      const notes = (notesByMatchId[matchId] ?? "").trim();
      const grantUsageRights = Boolean(rightsByMatchId[matchId]);
      const res = await fetch(`/api/creator/matches/${encodeURIComponent(matchId)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, notes: notes || undefined, grantUsageRights }),
      });
      const data = (await res.json().catch(() => null)) as { ok: true } | { ok: false; error?: string };
      if (!res.ok || !data || !("ok" in data) || data.ok !== true) {
        throw new Error(
          data && "error" in data && typeof data.error === "string" ? data.error : "Submit failed",
        );
      }
      setMessage("Submitted.");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submit failed");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 md:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Creator</Badge>
              <Badge variant="secondary">Deliverables</Badge>
            </div>
            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              Your deliverables
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              If verification fails automatically, submit your post URL for manual review.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/influencer/feed">
              <Button variant="secondary">Feed</Button>
            </Link>
            <Link href="/influencer/settings">
              <Button variant="outline">Profile</Button>
            </Link>
          </div>
        </div>

        {message ? (
          <div className="mt-6 rounded-lg border bg-muted p-4 text-sm text-muted-foreground">
            {message}
          </div>
        ) : null}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Queue</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Loading…"
                : status === "error"
                  ? "Error (check login + creator profile)."
                  : `${rows.length} total · ${dueCount} due.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!rows.length ? (
              <div className="text-sm text-muted-foreground">No deliverables yet.</div>
            ) : (
              <div className="grid gap-3">
                {rows.map((r) => (
                  <div key={r.deliverableId} className="rounded-lg border bg-card p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-balance">{r.offer.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{r.brand.name}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant={r.status === "VERIFIED" ? "success" : r.status === "FAILED" ? "danger" : "outline"}>
                            {r.status}
                          </Badge>
                          <Badge variant="secondary">Type: {r.expectedType}</Badge>
                          <Badge variant="secondary">Code: {r.match.campaignCode}</Badge>
                        </div>
                        {r.failureReason ? (
                          <div className="mt-3 text-sm text-danger">{r.failureReason}</div>
                        ) : null}
                        {r.verifiedPermalink ? (
                          <a className="mt-3 block break-all text-xs underline" href={r.verifiedPermalink} target="_blank" rel="noreferrer">
                            Verified link
                          </a>
                        ) : null}
                      </div>

                        {r.status === "DUE" ? (
                          <div className="w-full max-w-md rounded-lg border bg-muted p-3">
                            <Label htmlFor={`permalink-${r.match.id}`} className="text-xs">
                              {r.expectedType === "UGC_ONLY"
                                ? "UGC delivery link (Drive/Dropbox/etc.)"
                                : "Post URL (manual fallback)"}
                            </Label>
                            <div className="mt-2 flex gap-2">
                              <Input
                                id={`permalink-${r.match.id}`}
                                placeholder={
                                  r.expectedType === "UGC_ONLY"
                                    ? "https://drive.google.com/..."
                                    : "https://www.instagram.com/..."
                                }
                                value={draftByMatchId[r.match.id] ?? ""}
                                onChange={(e) =>
                                  setDraftByMatchId((prev) => ({ ...prev, [r.match.id]: e.target.value }))
                                }
                              />
                            </div>

                            <Label htmlFor={`notes-${r.match.id}`} className="mt-3 text-xs">
                              Notes (optional)
                            </Label>
                            <Textarea
                              id={`notes-${r.match.id}`}
                              className="mt-2"
                              placeholder="Any context for the brand (raw files, usage instructions, etc.)"
                              value={notesByMatchId[r.match.id] ?? ""}
                              onChange={(e) =>
                                setNotesByMatchId((prev) => ({ ...prev, [r.match.id]: e.target.value }))
                              }
                            />

                            {r.offer.usageRightsRequired ? (
                              <div className="mt-3 rounded-lg border bg-background p-3">
                                <div className="text-xs font-semibold text-foreground">Usage rights required</div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {formatUsageRightsScope(r.offer.usageRightsScope)}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  By granting rights, you allow the brand to reuse your submitted content within this scope
                                  (including paid ads if selected). Do not grant if you don’t own the rights to the content.
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    type="button"
                                    variant={rightsByMatchId[r.match.id] ? "default" : "outline"}
                                    onClick={() =>
                                      setRightsByMatchId((prev) => ({
                                        ...prev,
                                        [r.match.id]: !Boolean(prev[r.match.id]),
                                      }))
                                    }
                                  >
                                    {rightsByMatchId[r.match.id] ? "Rights granted" : "Grant rights"}
                                  </Button>
                                  {r.usageRightsGrantedAt ? (
                                    <Badge variant="success">Already granted</Badge>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            <div className="mt-3 flex justify-end">
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => submit(r.match.id)}
                                disabled={
                                  !(draftByMatchId[r.match.id] ?? "").trim() ||
                                  (r.offer.usageRightsRequired && !rightsByMatchId[r.match.id])
                                }
                              >
                                Submit
                              </Button>
                            </div>
                          </div>
                        ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
