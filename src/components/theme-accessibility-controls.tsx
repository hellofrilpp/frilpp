"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const THEME_KEY = "theme";
const A11Y_KEY = "frilpp-a11y";

function readPreferredDark() {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === "dark") return true;
  if (stored === "light") return false;
  if (stored === "system" || !stored) {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  }
  return false;
}

function applyDarkMode(enabled: boolean) {
  document.documentElement.classList.toggle("dark", enabled);
}

function applyA11y(enabled: boolean) {
  document.documentElement.classList.toggle("a11y", enabled);
}

export function ThemeAccessibilityControls() {
  const [dark, setDark] = useState(false);
  const [a11y, setA11y] = useState(false);

  useEffect(() => {
    const preferredDark = readPreferredDark();
    const preferredA11y = window.localStorage.getItem(A11Y_KEY) === "1";
    setDark(preferredDark);
    setA11y(preferredA11y);
    applyDarkMode(preferredDark);
    applyA11y(preferredA11y);
  }, []);

  useEffect(() => {
    applyDarkMode(dark);
    window.localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    applyA11y(a11y);
    window.localStorage.setItem(A11Y_KEY, a11y ? "1" : "0");
  }, [a11y]);

  const themeLabel = useMemo(() => (dark ? "Dark" : "Light"), [dark]);
  const a11yLabel = useMemo(() => (a11y ? "A11Y On" : "A11Y"), [a11y]);

  return (
    <div
      className="fixed bottom-3 right-3 z-50 flex items-center gap-2 rounded-md border border-input bg-background/85 p-2 backdrop-blur"
      role="group"
      aria-label="Theme and accessibility controls"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDark((v) => !v)}
        aria-pressed={dark}
        aria-label="Toggle dark mode"
        title="Toggle dark mode"
      >
        {themeLabel}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setA11y((v) => !v)}
        aria-pressed={a11y}
        aria-label="Toggle accessibility mode"
        title="Accessibility mode"
      >
        {a11yLabel}
      </Button>
    </div>
  );
}

