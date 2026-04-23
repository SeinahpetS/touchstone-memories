import { CategoryIconCard } from "@/components/CategoryIcon";
import type { CategoryKey } from "@/components/CategoryIcon";

type CategoryDef = {
  value: CategoryKey;
  enabled: boolean;
};

const CATEGORIES: CategoryDef[] = [
  { value: "moment", enabled: true },
  { value: "object", enabled: true },
  { value: "person", enabled: true },
  { value: "place", enabled: false },
  { value: "food", enabled: false },
  { value: "sound", enabled: false },
  { value: "imprint", enabled: false },
];

interface Props {
  value: string;
  onChange: (value: string) => void;
}

const CategorySelector = ({ value, onChange }: Props) => (
  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
    {CATEGORIES.map((cat) => (
      <CategoryIconCard
        key={cat.value}
        category={cat.value}
        active={value === cat.value && cat.enabled}
        comingSoon={!cat.enabled}
        onClick={() => onChange(cat.value)}
      />
    ))}
  </div>
);

export default CategorySelector;
