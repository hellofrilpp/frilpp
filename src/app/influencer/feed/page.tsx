"use client";

import { useEffect } from "react";

export default function InfluencerFeedRedirect() {
  useEffect(() => {
    window.location.href = "/influencer/discover";
  }, []);

  return null;
}
