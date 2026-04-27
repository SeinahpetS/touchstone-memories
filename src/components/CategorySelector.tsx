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
    {/* Row 1: 4 fixed-size tiles, matching constellation filter sizing */}
    <div className="grid grid-cols-4 gap-2 sm:gap-3 justify-items-center">
      {ROW_ONE.map((cat) => (
        <CategoryIconCard
          key={cat.value}
          category={cat.value}
          className="w-[110px] h-[75px] !min-w-0"
          active={value === cat.value && cat.enabled}
          comingSoon={!cat.enabled}
          onClick={() => onChange(cat.value)}
        />
      ))}
    </div>
    {/* Row 2: 3 tiles, stretched to align with row 1's left/right edges */}
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
