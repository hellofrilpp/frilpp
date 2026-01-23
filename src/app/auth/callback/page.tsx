"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    title: "Missing link",
    message: "This sign-in link is missing a token. Request a new link and try again.",
  },
  invalid: {
    key: "invalid",
    title: "Invalid link",
    message: "That link is invalid. Please request a fresh sign-in link.",
  },
  expired: {
    key: "expired",
    title: "Link expired",
    message: "That link has expired. Request a new sign-in link to continue.",
  },
  used: {
    key: "used",
    title: "Link already used",
    message: "This link has already been used to sign in. Request a new link if you need another login.",
  },
  server: {
    key: "server",
    title: "Server error",
    message: "We hit a server error while signing you in. Try again in a moment.",
  },
  default: {
    key: "default",
    title: "Sign-in failed",
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

export default function AuthCallbackPage() {
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
        const res = await fetch("/api/auth/callback", {
          method: "POST",
          headers: { "content-type": "application/json" },
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
        window.location.assign(nextPath);
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
    <div className="min-h-screen bg-[#0b0c10] text-[#f7f6ef]">
      <div className="min-h-screen bg-[linear-gradient(180deg,rgba(34,242,166,0.08),transparent_45%),linear-gradient(90deg,rgba(125,108,252,0.08),transparent_40%)]">
        <header className="border-b-4 border-[#1f2430] px-5 py-4">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center bg-[#22f2a6] text-xs font-mono uppercase text-[#0b0c10] shadow-[4px_4px_0_#000]">
                FP
              </div>
              <div className="text-xs font-mono uppercase tracking-[0.25em]">
                FRI<span className="text-[#f25bb5]">L</span>PP
              </div>
            </Link>
            <Link
              href="/brand/auth"
              className="text-xs font-mono uppercase text-[#7cfbd4] hover:text-[#22f2a6]"
            >
              Back
            </Link>
          </div>
        </header>

        <main className="flex min-h-[calc(100vh-88px)] items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="border-4 border-[#22f2a6] bg-[#141826] p-6 shadow-[6px_6px_0_#000]">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em] text-[#22f2a6]">
                [brand_portal]
              </div>
              <h1 className="mt-4 text-lg font-mono uppercase">
                {status === "loading" ? "Signing you in" : errorState.title}
              </h1>
              <p className="mt-3 text-sm text-[#cbd5e1]">
                {status === "loading" ? "Verifying your link. This should take a moment." : errorState.message}
              </p>

              <div className="mt-6 grid gap-3">
                {status === "loading" ? (
                  <button
                    type="button"
                    disabled
                    className="w-full border-2 border-[#22f2a6] bg-[#22f2a6] py-3 text-xs font-mono uppercase tracking-[0.2em] text-[#0b0c10] shadow-[4px_4px_0_#000]"
                  >
                    Checking link...
                  </button>
                ) : (
                  <>
                    <Link
                      href="/brand/auth"
                      className="w-full border-2 border-[#22f2a6] bg-[#22f2a6] py-3 text-center text-xs font-mono uppercase tracking-[0.2em] text-[#0b0c10] shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                    >
                      Get a new link
                    </Link>
                    <Link
                      href="/login"
                      className="w-full border-2 border-[#3a4157] bg-[#0b0c10] py-3 text-center text-xs font-mono uppercase tracking-[0.2em] text-[#cbd5e1] shadow-[4px_4px_0_#000] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000]"
                    >
                      Other sign-in options
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
