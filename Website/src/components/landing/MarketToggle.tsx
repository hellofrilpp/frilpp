import { Button } from "@/components/ui/button";
import { useMarket, type MarketingMarket } from "@/components/landing/market";

const options: Array<{ id: MarketingMarket; label: string }> = [
  { id: "US", label: "US" },
  { id: "IN", label: "India" },
];

export default function MarketToggle(props: { size?: "sm" | "md" }) {
  const { market, setMarket } = useMarket();
  const size = props.size ?? "sm";

  return (
    <div className="inline-flex items-center gap-1 rounded-md border-2 border-border bg-card p-1">
      {options.map((opt) => (
        <Button
          key={opt.id}
          type="button"
          size={size === "sm" ? "sm" : "default"}
          variant={market === opt.id ? "default" : "ghost"}
          className={
            market === opt.id
              ? "bg-neon-yellow text-background hover:bg-neon-yellow/90 font-pixel text-[10px] px-3"
              : "font-mono text-xs text-muted-foreground hover:text-foreground px-3"
          }
          onClick={() => setMarket(opt.id)}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

