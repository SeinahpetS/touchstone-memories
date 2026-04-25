import { cn } from "@/lib/utils";

export type ImprintType = "music" | "book" | "film" | "tv" | "art" | "quote" | "poem" | "podcast";

interface IconProps {
  size?: number;
  color?: string;
}

const Icon = {
  music: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path
        d="M14 25V10l14-3v15"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="11" cy="25" r="3" stroke={color} strokeWidth="1.5" />
      <circle cx="25" cy="22" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  book: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path
        d="M6 8c4-1 8-1 12 1v20c-4-2-8-2-12-1V8z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M30 8c-4-1-8-1-12 1v20c4-2 8-2 12-1V8z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  ),
  film: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect x="6" y="8" width="24" height="20" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="14" x2="30" y2="14" stroke={color} strokeWidth="1.5" />
      <line x1="6" y1="22" x2="30" y2="22" stroke={color} strokeWidth="1.5" />
      <line x1="11" y1="8" x2="11" y2="28" stroke={color} strokeWidth="1.5" />
      <line x1="25" y1="8" x2="25" y2="28" stroke={color} strokeWidth="1.5" />
    </svg>
  ),
  tv: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect
        x="5"
        y="10"
        width="26"
        height="17"
        rx="1.5"
        stroke={color}
        strokeWidth="1.5"
      />
      <line
        x1="13"
        y1="6"
        x2="18"
        y2="10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="23"
        y1="6"
        x2="18"
        y2="10"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  art: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect x="6" y="6" width="24" height="20" stroke={color} strokeWidth="1.5" />
      <circle cx="13" cy="13" r="2" stroke={color} strokeWidth="1.5" />
      <path
        d="M6 22l7-7 6 6 4-4 7 7"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <line
        x1="12"
        y1="30"
        x2="24"
        y2="30"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
  quote: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <path
        d="M9 22V14c0-2 1-3 3-3M9 22h5v-7H9M16 22V14c0-2 1-3 3-3M16 22h5v-7h-5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="M22 22V14c0-2 1-3 3-3M22 22h5v-7h-5"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  ),
  poem: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <line x1="9" y1="10" x2="22" y2="10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="15" x2="27" y2="15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="20" x2="20" y2="20" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="9" y1="25" x2="25" y2="25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  podcast: ({ size = 32, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="15" r="4" stroke={color} strokeWidth="1.5" />
      <rect x="14" y="11" width="8" height="13" rx="4" stroke={color} strokeWidth="1.5" />
      <path d="M11 17a7 7 0 0 0 14 0" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="18" y1="24" x2="18" y2="29" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="29" x2="22" y2="29" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const OPTIONS: { value: ImprintType; label: string }[] = [
  { value: "music", label: "Music" },
  { value: "book", label: "Book" },
  { value: "film", label: "Film" },
  { value: "tv", label: "TV Show" },
  { value: "art", label: "Art" },
  { value: "quote", label: "Quote" },
  { value: "poem", label: "Poem" },
  { value: "podcast", label: "Podcast" },
];

interface Props {
  value: ImprintType | null;
  onChange: (next: ImprintType) => void;
}

const ImprintTypeSelector = ({ value, onChange }: Props) => (
  <div className="flex flex-wrap justify-center gap-2">
    {OPTIONS.map(({ value: v, label }) => {
      const active = value === v;
      const IconComp = Icon[v];
      const fg = active ? "#F5F1E8" : "#2C3E50";
      return (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 transition-all duration-200",
            active
              ? "ring-2 ring-offset-2 shadow-md scale-[1.03]"
              : "opacity-80 hover:opacity-100 ring-0"
          )}
          style={{
            backgroundColor: active ? "#2C3E50" : "#E8E4D8",
            color: fg,
            ...({
              "--tw-ring-color": "#2C3E50",
              "--tw-ring-offset-color": "#F5F1E8",
            } as React.CSSProperties),
          }}
        >
          <IconComp size={16} color={fg} />
          <span className="font-jost text-[10px] uppercase tracking-[0.06em]" style={{ color: fg }}>
            {label}
          </span>
        </button>
      );
    })}
  </div>
);

export default ImprintTypeSelector;
