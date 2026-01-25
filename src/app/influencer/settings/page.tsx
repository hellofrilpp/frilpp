"use client";

import { useEffect } from "react";

export default function InfluencerSettingsRedirect() {
  useEffect(() => {
    window.location.href = "/influencer/profile";
  }, []);

  return null;
}
