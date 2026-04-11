import { cn } from "@/lib/utils";

const SENTIMENTS = ["safe", "complicated", "like home", "like loss", "like freedom"];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const SentimentPill = ({ value, onChange }: Props) => (
  <div className="space-y-2">
    <p className="text-sm text-muted-foreground">How does this feel? (optional)</p>
    <div className="flex flex-wrap gap-2">
      {SENTIMENTS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(value === s ? "" : s)}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm transition-colors",
            value === s
              ? "bg-foreground text-background"
              : "bg-card text-muted-foreground hover:bg-border"
          )}
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);

export default SentimentPill;
