import { format } from "date-fns";
import { formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import { CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";

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
      {/* Category icon tile */}
      <div className="flex justify-center">
        <div className="w-[84px]">
          <CategoryIconCard category={category as CategoryKey} />
        </div>
      </div>

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
    </div>
  );
};

export default MemoryArtifact;
