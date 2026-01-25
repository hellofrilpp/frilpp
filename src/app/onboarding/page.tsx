import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/redirects";

type OnboardingPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const resolved = searchParams ? await searchParams : {};
  const rawNext = Array.isArray(resolved?.next) ? resolved?.next[0] : resolved?.next ?? null;
  const next = sanitizeNextPath(rawNext, "/");
  if (next.startsWith("/brand/") || next.startsWith("/influencer/")) {
    redirect(next);
  }
  redirect("/");
}
