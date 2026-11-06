import { format } from "date-fns";
import { formatMemoryDate, type MemoryDate } from "@/lib/memoryDate";
import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
import { categoryHighlightColor } from "@/lib/categoryGlow";
import MemoryPhoto from "@/components/MemoryPhoto";
import ArtifactMentions from "@/components/ArtifactMentions";
import SendCopy from "@/components/SendCopy";
import ReceivedRecollection from "@/components/ReceivedRecollection";
import type { Person } from "@/lib/people";
import { lazy, Suspense } from "react";
import { MapPin } from "lucide-react";

const LocationSnippet = lazy(() => import("@/components/LocationSnippet"));

interface Props {
  touchstoneId?: string;
  mentionedPeople?: Person[];
  photoUrl?: string | null;
  category: string;
  title?: string | null;
  note?: string | null;
  receivedFromName?: string | null;
  receivedNote?: string | null;
  locationName?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  createdAt: string;
  memoryDate?: MemoryDate;
  onClose?: () => void;
  /** Review photos precede the category and retain a 4:3 frame. */
  photoFirst?: boolean;
}

const MemoryArtifact = ({ touchstoneId, mentionedPeople, photoUrl, category, title, note, receivedFromName, receivedNote, locationName, locationLat, locationLng, createdAt, memoryDate, onClose, photoFirst = false }: Props) => {
  const hasLocation = locationLat != null && locationLng != null;
  const memoryDateLabel = memoryDate ? formatMemoryDate(memoryDate) : null;
  return (
    <div className="space-y-6 text-center">
      {photoFirst && photoUrl && <MemoryPhoto src={photoUrl} alt={title || "Memory"} className="w-full h-auto max-h-[60dvh] object-contain" />}
      {/* Inline category label */}
      <div
        className="flex items-center justify-center"
        style={{
          paddingTop: 20,
          paddingBottom: 12,
          gap: 6,
          // 2pt rule closing off the category heading.
          borderBottom: `2pt solid ${categoryHighlightColor(category)}`,
        }}
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


      {!photoFirst && photoUrl && (
        <MemoryPhoto src={photoUrl} alt={title || "Memory"} className="w-full rounded-lg object-cover max-h-72" />
      )}

      {receivedFromName && <p className="received-from-label">From {receivedFromName}</p>}
      {title && <h2 className="font-playfair text-xl font-semibold text-foreground">{title}</h2>}

      {hasLocation && (
        <p className={`artifact-location-line ${title ? "!mt-1" : ""}`}><MapPin size={14} color="#B8860B" aria-hidden="true" /><span>{locationName?.trim() || "Pinned location"}</span></p>
      )}

      {memoryDateLabel ? (
        <div className={`space-y-1 ${title ? "!mt-1.5" : ""}`}>
          <p className="font-playfair italic text-base text-foreground">{memoryDateLabel}</p>
          <p className="text-xs text-muted-foreground">
            Saved {format(new Date(createdAt), "MMMM d, yyyy")}
          </p>
        </div>
      ) : (
        <p className={`text-sm text-muted-foreground ${title ? "!mt-1.5" : ""}`}>
          {format(new Date(createdAt), "MMMM d, yyyy")}
        </p>
      )}

      <ArtifactMentions touchstoneId={touchstoneId} people={mentionedPeople} />
      {touchstoneId && <SendCopy key={touchstoneId} touchstoneId={touchstoneId} mentionedPeople={mentionedPeople} />}
      {note && <p className="text-base text-foreground leading-relaxed">{note}</p>}
      {hasLocation && (
        <Suspense fallback={null}><LocationSnippet lat={locationLat!} lng={locationLng!} name={locationName} /></Suspense>
      )}
      <ReceivedRecollection name={receivedFromName} note={receivedNote} />
    </div>
  );
};

export default MemoryArtifact;
