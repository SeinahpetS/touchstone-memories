import { CategoryIconCard } from "@/components/CategoryIcon";
import type { CategoryKey } from "@/components/CategoryIcon";

type CategoryDef = {
  value: CategoryKey;
  enabled: boolean;
};

const ROW_ONE: CategoryDef[] = [
  { value: "moment", enabled: true },
  { value: "person", enabled: true },
  { value: "object", enabled: true },
  { value: "place", enabled: true },
];

const ROW_TWO: CategoryDef[] = [
  { value: "food", enabled: true },
  { value: "sound", enabled: true },
  { value: "imprint", enabled: true },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CategorySelector = ({ value, onChange }: Props) => (
  <div className="space-y-3">
    {/* Row 1: 4 tiles across */}
    <div className="grid grid-cols-4 gap-3">
      {ROW_ONE.map((cat) => (
        <CategoryIconCard
          key={cat.value}
          category={cat.value}
          active={value === cat.value && cat.enabled}
          comingSoon={!cat.enabled}
          onClick={() => onChange(cat.value)}
        />
      ))}
    </div>
    {/* Row 2: 3 tiles centered, same width as row 1 (8 cols, each tile spans 2, offset by 1) */}
    <div className="grid grid-cols-8 gap-3">
      {ROW_TWO.map((cat, i) => (
        <div
          key={cat.value}
          className={i === 0 ? "col-span-2 col-start-2" : "col-span-2"}
        >
          <CategoryIconCard
            category={cat.value}
            active={value === cat.value && cat.enabled}
            comingSoon={!cat.enabled}
            onClick={() => onChange(cat.value)}
          />
        </div>
      ))}
    </div>
  </div>
);

export default CategorySelector;
