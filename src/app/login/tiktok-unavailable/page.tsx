import { Suspense } from "react";
import TikTokUnavailableClient from "./tiktok-unavailable-client";

export default function TikTokUnavailablePage() {
  return (
    <Suspense>
      <TikTokUnavailableClient />
    </Suspense>
  );
}

