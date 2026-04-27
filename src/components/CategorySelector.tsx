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

// Row 1: 4 tiles × 110px + 3 gaps × 12px = 476px total width.
// Row 2: same 476px width split across 3 tiles + 2 gaps = (476 - 24) / 3 ≈ 150.67px per tile.
const CategorySelector = ({ value, onChange }: Props) => (
  <div className="flex flex-col items-center gap-3">
    {/* Row 1: 4 fixed-size tiles, matching constellation filter sizing */}
    <div className="flex justify-center gap-3">
      {ROW_ONE.map((cat) => (
        <CategoryIconCard
          key={cat.value}
          category={cat.value}
          className="w-[110px] h-[75px] !min-w-0"
          iconSize={33}
          active={value === cat.value && cat.enabled}
          comingSoon={!cat.enabled}
          onClick={() => onChange(cat.value)}
        />
      ))}
    </div>
    {/* Row 2: 3 tiles, stretched so the row spans the same width as row 1 */}
    <div
      className="grid grid-cols-3 gap-3"
      style={{ width: "476px", maxWidth: "100%" }}
    >
      {ROW_TWO.map((cat) => (
        <CategoryIconCard
          key={cat.value}
          category={cat.value}
          className="w-full h-[75px] !min-w-0"
          active={value === cat.value && cat.enabled}
          comingSoon={!cat.enabled}
          onClick={() => onChange(cat.value)}
        />
      ))}
    </div>
  </div>
);

export default CategorySelector;
