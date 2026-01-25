import { cn } from "@/lib/cn";

type ProgressProps = {
  value?: number;
  className?: string;
};

export function Progress({ value = 0, className }: ProgressProps) {
  const normalized = Math.min(Math.max(value, 0), 100);
  return (
    <div className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className="h-full bg-primary transition-all" style={{ width: `${normalized}%` }} />
    </div>
  );
}
