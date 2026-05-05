import CategoryIcon, { CATEGORY_BORDER_COLORS, type CategoryKey } from "@/components/CategoryIcon";

const CATEGORIES: CategoryKey[] = [
  "moment",
  "person",
  "object",
  "place",
  "food",
  "sound",
  "imprint",
  "digital_traces",
];

const PLURAL_LABELS: Record<CategoryKey, string> = {
  moment: "Moments",
  person: "People",
  object: "Objects",
  place: "Places",
  food: "Foods",
  sound: "Sounds",
  imprint: "Imprints",
  digital_traces: "Digital Traces",
};

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CategorySelector = ({ value, onChange }: Props) => (
  <div
    className="grid"
    style={{ gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}
  >
    {CATEGORIES.map((c) => {
      const active = value === c;
      return (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-pressed={active}
          style={{
            background: "#1E2E3E",
            borderRadius: 12,
            border: active ? `4px solid ${CATEGORY_BORDER_COLORS[c]}` : "2px solid transparent",
            padding: "10px 6px 8px",
            height: 78,
          }}
          className="flex flex-col items-center justify-center"
        >
          <span style={{ marginBottom: 6 }} className="flex items-center justify-center">
            <CategoryIcon category={c} size={c === "imprint" ? 18 : 22} color="#B8860B" />
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.12em",
              color: "#E8E4D8",
              textTransform: "uppercase",
              fontWeight: 500,
              fontFamily: "Jost, sans-serif",
            }}
          >
            {PLURAL_LABELS[c]}
          </span>
        </button>
      );
    })}
  </div>
);

export default CategorySelector;
