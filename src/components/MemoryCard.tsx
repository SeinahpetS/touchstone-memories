import { format } from "date-fns";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
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
  };
  onClick?: () => void;
}

const MemoryCard = ({ memory, onClick }: Props) => (
  <button
    onClick={onClick}
    className="w-full text-left rounded-lg overflow-hidden bg-card transition-colors hover:bg-border"
  >
    {/* Category stripe */}
    <div className={cn("h-1.5", CATEGORY_COLORS[memory.category] || "bg-foreground")} />

    {memory.photo_url && (
      <img
        src={memory.photo_url}
        alt={memory.title || "Memory"}
        className="w-full h-32 object-cover"
        loading="lazy"
      />
    )}

    <div className="p-4 space-y-1">
      {memory.title && (
        <h3 className="font-playfair text-base font-semibold text-foreground line-clamp-1">
          {memory.title}
        </h3>
      )}
      <p className="text-sm text-muted-foreground">
        {format(new Date(memory.created_at), "MMM d, yyyy")}
      </p>
      {memory.note && (
        <p className="text-sm text-muted-foreground line-clamp-2">{memory.note}</p>
      )}
    </div>
  </button>
);

export default MemoryCard;
