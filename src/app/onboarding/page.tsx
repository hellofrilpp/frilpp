import { redirect } from "next/navigation";
import { sanitizeNextPath } from "@/lib/redirects";

type OnboardingPageProps = {
  searchParams?: { next?: string };
};

export default function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const next = sanitizeNextPath(searchParams?.next ?? null, "/");
  if (next.startsWith("/brand/") || next.startsWith("/influencer/")) {
    redirect(next);
  }
  redirect("/");
}
