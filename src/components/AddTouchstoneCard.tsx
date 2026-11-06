import { Plus } from "lucide-react";
import type { CategoryKey } from "@/components/CategoryIcon";

/** Singular wording for the filter-specific call to action ("Add a person"). */
const SINGULAR: Record<CategoryKey, string> = {
  moment: "moment",
  person: "person",
  object: "object",
  place: "place",
  food: "food",
  sound: "sound",
  imprint: "imprint",
  digital_traces: "digital trace",
};

interface Props {
  /** Active category filter — "all" gives the generic "Add a touchstone". */
  category: "all" | CategoryKey;
  onAdd: () => void;
}

/**
 * AddTouchstoneCard — first tile in the archive grid, in place of the old
 * pinned buttons. Same footprint and corner radius as MemoryCard (radius 12,
 * 1:1 frame above a titled body) but transparent with a dashed Old Gold
 * outline, so it reads as "add" rather than as another memory.
 */
const AddTouchstoneCard = ({ category, onAdd }: Props) => {
  const label =
    category === "all" ? "Add a touchstone" : `Add a ${SINGULAR[category]}`;

  return (
    <button
      type="button"
      onClick={onAdd}
      className="w-full text-left overflow-hidden transition-opacity hover:opacity-80"
      style={{
        backgroundColor: "transparent",
        border: "1.5px dashed #B8860B",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        padding: 10,
      }}
    >
      {/* Navy rounded square holding a gold "+", matching the card icon tiles */}
      <span
        aria-hidden
        style={{
          width: 52,
          height: 52,
          borderRadius: 10,
          backgroundColor: "#1E2E3E",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Plus size={34} color="#B8860B" strokeWidth={1.5} />
      </span>
      <span
        className="line-clamp-1"
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 16,
          fontWeight: 600,
          color: "#9E9585",
          margin: 0,
        }}
      >
        {label}
      </span>
    </button>
  );
};

export default AddTouchstoneCard;
