"use client";

import { useEffect } from "react";

export default function InfluencerAchievementsRedirect() {
  useEffect(() => {
    window.location.href = "/achievements";
  }, []);

  return null;
}
