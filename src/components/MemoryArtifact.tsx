import { format } from "date-fns";
import { formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";

const CATEGORY_COLORS: Record<string, string> = {
  moment: "bg-gold",
  object: "bg-pewter",
  person: "bg-plum",
  place: "bg-malachite",
  food: "bg-terracotta",
  sound: "bg-blueprint",
  imprint: "bg-ink",
};

interface Props {
  photoUrl?: string | null;
  category: string;
  title?: string | null;
  note?: string | null;
  createdAt: string;
  memoryDate?: MemoryDate;
  onClose?: () => void;
}

const MemoryArtifact = ({ photoUrl, category, title, note, createdAt, memoryDate, onClose }: Props) => {
  const memoryDateLabel = memoryDate ? formatMemoryDate(memoryDate) : null;
  return (
    <div className="space-y-6 text-center">
      {/* Category stripe */}
      <div className={`h-1.5 w-16 mx-auto rounded-full ${CATEGORY_COLORS[category] || "bg-foreground"}`} />

      {photoUrl && (
        <img src={photoUrl} alt={title || "Memory"} className="w-full rounded-lg object-cover max-h-72" />
      )}

      {title && <h2 className="font-playfair text-xl font-semibold text-foreground">{title}</h2>}

      {memoryDateLabel ? (
        <div className="space-y-1">
          <p className="font-playfair italic text-base text-foreground">{memoryDateLabel}</p>
          <p className="text-xs text-muted-foreground">
            Saved {format(new Date(createdAt), "MMMM d, yyyy")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {format(new Date(createdAt), "MMMM d, yyyy")}
        </p>
      )}

      {note && <p className="text-base text-foreground leading-relaxed">{note}</p>}


      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 rounded-full bg-primary px-6 py-3 text-base text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Capture another
        </button>
      )}
    </div>
  );
};

export default MemoryArtifact;
