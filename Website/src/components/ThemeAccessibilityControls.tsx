import { AccessibilityToggle } from "@/components/AccessibilityToggle";
import { ThemeToggle } from "@/components/ThemeToggle";

const ThemeAccessibilityControls = () => (
  <div
    className="fixed right-2 top-24 z-[60] flex items-center gap-2 border-2 border-border bg-card/90 px-2 py-2 backdrop-blur-sm sm:right-4"
    role="group"
    aria-label="Theme and accessibility controls"
  >
    <ThemeToggle />
    <AccessibilityToggle />
  </div>
);

export default ThemeAccessibilityControls;
