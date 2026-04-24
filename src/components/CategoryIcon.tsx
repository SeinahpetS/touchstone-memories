import { cn } from "@/lib/utils";

export type CategoryKey =
  | "moment"
  | "person"
  | "object"
  | "place"
  | "food"
  | "sound"
  | "imprint";

interface CategoryIconProps {
  category: CategoryKey | "people";
  size?: number;
  color?: string;
  className?: string;
}

/**
 * CategoryIcon — gold outline glyphs for the seven Touchstone categories.
 * Note: the database enum uses `person`; the spec uses `people`. Both are accepted.
 */
const CategoryIcon = ({
  category,
  size = 36,
  color = "hsl(var(--gold))",
  className,
}: CategoryIconProps) => {
  const key = category === "people" ? "person" : category;

  const icons: Record<CategoryKey, JSX.Element> = {
    moment: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <polyline
          points="6,7 18,20 30,7"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="6,17 18,30 30,17"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    person: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <circle cx="18" cy="13" r="5" stroke={color} strokeWidth="1.5" fill="none" />
        <path
          d="M7,30 C7,23 11,20 18,20 C25,20 29,23 29,30"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
    object: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <path
          d="M10,5 L26,5 L18,18 L26,31 L10,31 L18,18 Z"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="10" y1="5" x2="26" y2="5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="10" y1="31" x2="26" y2="31" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    place: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <circle cx="18" cy="13" r="5" stroke={color} strokeWidth="1.5" />
        <line x1="18" y1="18" x2="18" y2="31" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    food: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <line x1="13" y1="7" x2="13" y2="29" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="7" x2="11" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="15" y1="7" x2="15" y2="14" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11,14 Q13,17 15,14" stroke={color} strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <line x1="23" y1="7" x2="23" y2="29" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M23,7 C27,9 28,14 26,18 C25,20 23,21 23,21"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    ),
    sound: (
      <svg width={size} height={size} viewBox="5 33 90 32" fill="none" className={className}>
        <path
          d="M41.236,67.521c-1.025,0-2.018-0.402-2.813-1.144c-0.814-0.76-1.397-1.854-1.685-3.165L32.826,45.42c-0.252-1.148-0.807-1.663-1.219-1.659c-0.432,0.006-1.002,0.562-1.232,1.767l-1.578,8.264c-0.224,1.171-0.701,2.202-1.38,2.981c-0.722,0.828-1.629,1.343-2.624,1.489c-0.892,0.131-1.784-0.05-2.579-0.523c-0.769-0.457-1.4-1.154-1.878-2.071c-1.684-3.232-4.297-5.161-6.99-5.161H6.688C5.756,50.508,5,49.752,5,48.821c0-0.932,0.756-1.688,1.688-1.688h6.659c1.997,0,3.98,0.663,5.735,1.918c1.682,1.203,3.151,2.952,4.248,5.059c0.29,0.557,0.654,0.861,0.973,0.814c0.417-0.061,0.965-0.639,1.179-1.764l1.578-8.264c0.248-1.299,0.79-2.406,1.567-3.201c0.81-0.828,1.851-1.293,2.933-1.308c1.071-0.014,2.112,0.412,2.932,1.203c0.787,0.759,1.35,1.832,1.63,3.105l3.912,17.791c0.257,1.169,0.817,1.679,1.23,1.659c0.514-0.026,1.114-0.745,1.267-2.067l2.834-24.544c0.169-1.462,0.689-2.71,1.504-3.61c0.844-0.932,1.956-1.445,3.131-1.445c1.175,0,2.287,0.513,3.131,1.445c0.815,0.9,1.336,2.149,1.504,3.61l2.834,24.544c0.153,1.323,0.753,2.041,1.267,2.067c0.41,0.021,0.973-0.489,1.23-1.659l3.912-17.791c0.28-1.273,0.844-2.347,1.63-3.105c0.82-0.791,1.86-1.218,2.932-1.203c1.081,0.015,2.123,0.48,2.933,1.308c0.777,0.795,1.319,1.902,1.567,3.201l1.578,8.264c0.215,1.124,0.762,1.703,1.179,1.764c0.319,0.047,0.683-0.257,0.973-0.814c1.098-2.107,2.567-3.856,4.248-5.059c1.755-1.255,3.738-1.918,5.735-1.918h6.659c0.932,0,1.688,0.756,1.688,1.688c0,0.932-0.756,1.688-1.688,1.688h-6.659c-2.693,0-5.306,1.929-6.99,5.161c-0.478,0.917-1.109,1.613-1.878,2.071c-0.795,0.473-1.687,0.654-2.579,0.523c-0.994-0.146-1.902-0.661-2.624-1.489c-0.679-0.779-1.157-1.81-1.38-2.981l-1.578-8.264c-0.23-1.206-0.8-1.761-1.232-1.767c-0.002,0-0.004,0-0.007,0c-0.409,0-0.961,0.517-1.212,1.659l-3.912,17.791c-0.288,1.311-0.871,2.405-1.685,3.165c-0.847,0.79-1.917,1.195-3.012,1.139c-1.935-0.098-4.061-1.698-4.448-5.051l-2.834-24.544c-0.157-1.357-0.764-2.067-1.282-2.067c-0.519,0-1.126,0.71-1.282,2.067l-2.834,24.544c-0.387,3.353-2.513,4.953-4.448,5.051C41.369,67.519,41.302,67.521,41.236,67.521z"
          fill={color}
        />
      </svg>
    ),
    imprint: (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none" className={className}>
        <g stroke={color} strokeWidth="1.5" strokeLinecap="round">
          <line x1="4" y1="28" x2="32" y2="28" />
          <line x1="18" y1="28" x2="3" y2="18" />
          <line x1="18" y1="28" x2="8" y2="11" />
          <line x1="18" y1="28" x2="18" y2="6" />
          <line x1="18" y1="28" x2="28" y2="11" />
          <line x1="18" y1="28" x2="33" y2="18" />
        </g>
      </svg>
    ),
  };

  return icons[key as CategoryKey] || null;
};

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  moment: "Moment",
  person: "People",
  object: "Object",
  place: "Place",
  food: "Food",
  sound: "Sound",
  imprint: "Imprint",
};

interface CategoryIconCardProps {
  category: CategoryKey;
  label?: string;
  active?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
  onClick?: () => void;
  size?: number;
}

/**
 * CategoryIconCard — the dark tile presentation used in the capture selector
 * and archive filter bar. Active state shows a brighter gold border.
 */
export const CategoryIconCard = ({
  category,
  label,
  active,
  disabled,
  comingSoon,
  onClick,
  size = 36,
}: CategoryIconCardProps) => {
  const displayLabel = label ?? CATEGORY_LABELS[category];
  const isInteractive = !disabled && !comingSoon;

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      aria-pressed={active}
      aria-label={`${displayLabel}${comingSoon ? " (coming soon)" : ""}`}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-2 rounded-[10px] px-2 pt-4 pb-3 transition-colors",
        "min-w-[68px] sm:min-w-[84px]",
        active
          ? "bg-[hsl(var(--background))] border-2 border-[hsl(var(--gold))]"
          : "bg-[hsl(var(--dark-card))] border border-[hsl(var(--gold)/0.18)]",
        isInteractive && !active && "hover:border-[hsl(var(--gold)/0.35)]",
        comingSoon && "opacity-40 cursor-not-allowed",
        disabled && !comingSoon && "opacity-50 cursor-not-allowed"
      )}
    >
      <CategoryIcon
        category={category}
        size={size}
        color={active ? "hsl(var(--foreground))" : "hsl(var(--gold))"}
      />
      <span
        className={cn(
          "font-sans text-[10px] uppercase tracking-[0.06em]",
          active ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--label-color))]"
        )}
      >
        {displayLabel}
      </span>
      {comingSoon && (
        <span className="text-[9px] uppercase tracking-[0.06em] text-[hsl(var(--label-color)/0.7)]">
          Coming soon
        </span>
      )}
    </button>
  );
};

export default CategoryIcon;
