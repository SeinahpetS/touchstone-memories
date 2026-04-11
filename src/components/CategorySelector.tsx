import { cn } from "@/lib/utils";

type Category = {
  value: string;
  label: string;
  color: string;
  enabled: boolean;
};

const CATEGORIES: Category[] = [
  { value: "moment", label: "Moment", color: "bg-gold", enabled: true },
  { value: "object", label: "Object", color: "bg-espresso", enabled: true },
  { value: "person", label: "Person", color: "bg-plum", enabled: true },
  { value: "place", label: "Place", color: "bg-malachite", enabled: false },
  { value: "food", label: "Food", color: "bg-terracotta", enabled: false },
  { value: "sound", label: "Sound", color: "bg-blueprint", enabled: false },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CategorySelector = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap gap-2">
    {CATEGORIES.map((cat) => (
      <button
        key={cat.value}
        type="button"
        disabled={!cat.enabled}
        onClick={() => cat.enabled && onChange(cat.value)}
        className={cn(
          "flex items-center gap-2 rounded-full px-4 py-2 text-base transition-colors",
          cat.enabled
            ? value === cat.value
              ? "bg-foreground text-background"
              : "bg-card text-foreground hover:bg-border"
            : "bg-muted text-muted-foreground/50 cursor-not-allowed"
        )}
      >
        <span className={cn("inline-block h-2.5 w-2.5 rounded-full", cat.color)} />
        {cat.label}
        {!cat.enabled && <span className="text-xs ml-1">soon</span>}
      </button>
    ))}
  </div>
);

export default CategorySelector;
