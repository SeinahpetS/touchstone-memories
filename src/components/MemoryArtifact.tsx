import { format } from "date-fns";
import { formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
import MemoryPhoto from "@/components/MemoryPhoto";

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
      {/* Inline category label */}
      <div
        className="flex items-center justify-center"
        style={{ paddingTop: 20, paddingBottom: 12, gap: 6 }}
      >
        <CategoryIcon
          category={category as CategoryKey}
          size={16}
          color="#1E2E3E"
        />
        <span
          style={{
            fontFamily: "Jost, sans-serif",
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#1E2E3E",
          }}
        >
          {CATEGORY_LABELS[category as CategoryKey]}
        </span>
      </div>


      {photoUrl && (
        <MemoryPhoto src={photoUrl} alt={title || "Memory"} className="w-full rounded-lg object-cover max-h-72" />
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
    </div>
  );
};

export default MemoryArtifact;
