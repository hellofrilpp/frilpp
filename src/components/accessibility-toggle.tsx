"use client";

import { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";

const A11Y_KEY = "frilpp-a11y";

function applyA11y(enabled: boolean) {
  document.documentElement.classList.toggle("a11y", enabled);
  window.localStorage.setItem(A11Y_KEY, enabled ? "1" : "0");
}

export function AccessibilityToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(A11Y_KEY) === "1";
    setEnabled(stored);
    applyA11y(stored);
  }, []);

  const toggleA11y = () => {
    setEnabled((prev) => {
      const next = !prev;
      applyA11y(next);
      return next;
    });
  };

  return (
    <button
      type="button"
      onClick={toggleA11y}
      aria-pressed={enabled}
      aria-label="Toggle accessibility mode"
      title="Accessibility mode"
      className="inline-flex h-9 w-9 items-center justify-center border-2 border-primary bg-transparent text-primary pixel-btn hover:bg-primary/20"
    >
      <Accessibility className="h-4 w-4 text-neon-blue" />
      <span className="sr-only">Toggle accessibility mode</span>
    </button>
  );
}
