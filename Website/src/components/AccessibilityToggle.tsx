import { useEffect, useState } from "react";
import { Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";

const ACCESSIBILITY_CLASS = "a11y";
const STORAGE_KEY = "frilpp-a11y";

export function AccessibilityToggle() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });

  useEffect(() => {
    document.documentElement.classList.toggle(ACCESSIBILITY_CLASS, enabled);
    window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  }, [enabled]);

  const handleToggle = () => {
    setEnabled((prev) => !prev);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="pixel-btn border-2 border-primary hover:bg-primary/20"
      aria-pressed={enabled}
      aria-label="Toggle accessibility mode"
      title="Accessibility mode"
    >
      <Accessibility className="h-4 w-4 text-neon-blue" />
      <span className="sr-only">Toggle accessibility mode</span>
    </Button>
  );
}
