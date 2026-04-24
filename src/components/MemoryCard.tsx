import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
import { cn } from "@/lib/utils";
import { formatMemoryDate } from "@/lib/memoryDate";

const CATEGORY_STRIPE: Record<string, string> = {
  moment: "bg-gold",
  object: "bg-espresso",
  person: "bg-plum",
  place: "bg-malachite",
  food: "bg-terracotta",
  sound: "bg-blueprint",
  imprint: "bg-ink",
};

interface Props {
  memory: {
    id: string;
    category: string;
    title?: string | null;
    note?: string | null;
    photo_url?: string | null;
    created_at: string;
    memory_season?: string | null;
    memory_year?: number | null;
    memory_month?: number | null;
    memory_day?: number | null;
  };
  onClick?: () => void;
}

const MemoryCard = ({ memory, onClick }: Props) => {
  const cat = memory.category as CategoryKey;
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg overflow-hidden bg-card transition-colors hover:bg-border"
    >
      {/* Category stripe */}
      <div className={cn("h-1.5", CATEGORY_STRIPE[memory.category] || "bg-foreground")} />

      {memory.photo_url && (
        <img
          src={memory.photo_url}
          alt={memory.title || "Memory"}
          className="w-full h-32 object-cover"
          loading="lazy"
        />
      )}

      <div className="p-4 space-y-2">
        {/* Category icon + label */}
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--dark-card))] p-1">
            <CategoryIcon category={cat} size={16} />
          </span>
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
            {CATEGORY_LABELS[cat] ?? memory.category}
          </span>
        </div>

        {memory.title && (
          <h3 className="font-playfair text-base font-semibold text-foreground line-clamp-1">
            {memory.title}
          </h3>
        )}
        {(() => {
          const memoryDateLabel = formatMemoryDate({
            season: (memory.memory_season as any) ?? null,
            year: memory.memory_year ?? null,
            month: memory.memory_month ?? null,
            day: memory.memory_day ?? null,
          });
          return memoryDateLabel ? (
            <p className="font-jost text-xs font-light text-[#5B4A3F]/60">
              {memoryDateLabel}
            </p>
          ) : null;
        })()}
        {memory.note && (
          <p className="text-sm text-muted-foreground line-clamp-2">{memory.note}</p>
        )}
      </div>
    </button>
  );
};

export default MemoryCard;
