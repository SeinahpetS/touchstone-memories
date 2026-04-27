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
        <circle
          cx="18"
          cy="13"
          r="4.73"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <path
          d="M8,30 C8,25 12,23 18,23 C24,23 28,25 28,30"
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
        <circle
          cx="18"
          cy="13"
          r="4.73"
          stroke={color}
          strokeWidth="1.5"
          fill="none"
        />
        <line x1="18" y1="17.73" x2="18" y2="29.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
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
        <g transform="translate(18,18) scale(3) translate(-8.4667969,-290.5)" fill={color}>
          <path d="m 8.4667969,281.23242 c -1.4414837,0 -2.8824714,0.37358 -4.1738281,1.11914 a 0.26460981,0.26460981 0 1 0 0.2636718,0.45703 c 2.4197234,-1.39702 5.4005892,-1.39702 7.8203124,0 a 0.26460981,0.26460981 0 1 0 0.263672,-0.45703 C 11.349268,281.606 9.9082806,281.23242 8.4667969,281.23242 Z" />
          <path d="m 8.4667969,283.0293 c -2.1371593,0 -4.2752301,0.81624 -5.9042969,2.44531 a 0.26460981,0.26460981 0 1 0 0.375,0.37305 c 3.0559132,-3.05592 8.00268,-3.05592 11.058594,0 a 0.26460981,0.26460981 0 1 0 0.373047,-0.37305 c -1.629067,-1.62907 -3.765185,-2.44531 -5.9023441,-2.44531 z" />
          <path d="m 9.2265625,284.72266 c -0.711931,-0.0994 -1.4541001,-0.0609 -2.1914063,0.13672 -2.9492247,0.79024 -4.7043047,3.82811 -3.9140624,6.77734 A 0.26483409,0.26483409 0 1 0 3.6328125,291.5 c -0.7162245,-2.67299 0.8660761,-5.41268 3.5390625,-6.12891 2.6729864,-0.71622 5.412682,0.86608 6.128906,3.53907 a 0.26483424,0.26483424 0 1 0 0.511719,-0.13672 c -0.592682,-2.21192 -2.450144,-3.75255 -4.5859375,-4.05078 z" />
          <path d="m 8.3125,288.36719 c -1.0266885,0.14256 -1.9747664,1.03878 -1.9765625,2.63672 -1.16e-5,6.2e-4 1.14e-5,0.001 0,0.002 -4e-7,7.6e-4 0,0.001 0,0.002 -0.015786,0.88174 0.1988186,1.85052 0.8769531,2.69727 0.6790912,0.84794 1.8109433,1.55846 3.5761714,1.96484 a 0.26460981,0.26460981 0 1 0 0.119141,-0.51562 C 9.2255998,294.76693 8.2173869,294.11224 7.6269531,293.375 7.0365193,292.63776 6.8504769,291.80512 6.8652344,291.01367 v -0.004 -0.002 c 0,-1.40323 0.7332863,-2.00773 1.5214844,-2.11719 0.788198,-0.10945 1.6259962,0.31405 1.8574222,1.17774 l 0.002,0.004 v 0.006 c 0.48154,1.56612 1.67153,2.32062 2.658203,2.07618 0.493337,-0.12222 0.90672,-0.51215 1.085937,-1.09571 0.179218,-0.58356 0.14391,-1.35128 -0.183593,-2.30273 a 0.26460981,0.26460981 0 1 0 -0.5,0.17187 c 0.302517,0.87887 0.312005,1.53936 0.177734,1.97657 -0.134271,0.4372 -0.391867,0.65825 -0.707031,0.73632 -0.630328,0.15616 -1.60087,-0.33808 -2.025391,-1.71874 l 0.0039,0.01 C 10.452617,288.79992 9.3401618,288.22449 8.3125,288.36719 Z" />
          <path d="m 8.2363281,286.63672 c -0.5736526,0.0891 -1.1348663,0.29775 -1.6386719,0.60937 -1.0076111,0.62325 -1.7931658,1.66798 -1.9648437,2.99414 -0.1716779,1.32617 0.2729751,2.91173 1.6425781,4.60743 A 0.26461515,0.26461515 0 1 0 6.6875,294.51562 C 5.3834556,292.9011 5.0082459,291.46697 5.1582031,290.30859 5.3081604,289.15022 5.9869667,288.2446 6.875,287.69531 c 0.8880333,-0.54928 1.9790366,-0.72885 2.9199219,-0.4414 0.9408851,0.28744 1.7506111,1.02359 2.1210941,2.40625 a 0.26460981,0.26460981 0 1 0 0.509765,-0.13672 c -0.409361,-1.52776 -1.369067,-2.43705 -2.4765622,-2.77539 -0.5537477,-0.16917 -1.139238,-0.20044 -1.7128907,-0.11133 z" />
          <path d="m 8.4667969,290.38086 a 0.26460981,0.26460981 0 0 0 -0.2597657,0.31641 c 0.277962,1.52879 1.1389656,2.47481 2.1621098,2.96875 1.023143,0.49393 2.194159,0.5582 3.162109,0.41992 a 0.26460981,0.26460981 0 1 0 -0.07422,-0.52344 c -0.884133,0.12631 -1.962336,0.0591 -2.857422,-0.37305 -0.895085,-0.43211 -1.6218418,-1.20431 -1.8730465,-2.58593 a 0.26460981,0.26460981 0 0 0 -0.2597656,-0.22266 z" />
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

export const CATEGORY_BORDER_COLORS: Record<CategoryKey, string> = {
  moment: "#9E1268",
  person: "#8B3A62",
  object: "#4A6B8A",
  place: "#2E7D5E",
  food: "#C2714F",
  sound: "#6B7280",
  imprint: "#5B4A3F",
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
 * CategoryIconCard — dark navy tile. Background never changes on selection.
 * Active state: category-coloured 2px border + matching outer glow,
 * icon and label at full opacity. Inactive: muted border, reduced opacity.
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

  const borderColor = CATEGORY_BORDER_COLORS[category];

  return (
    <button
      type="button"
      onClick={isInteractive ? onClick : undefined}
      disabled={!isInteractive}
      aria-pressed={active}
      aria-label={`${displayLabel}${comingSoon ? " (coming soon)" : ""}`}
      style={{
        backgroundColor: active ? "#F5F0E8" : "#2C3E50",
        borderColor: active ? borderColor : "transparent",
        borderWidth: active ? "2px" : "0px",
        borderStyle: "solid",
        boxShadow: active ? `0 0 0 3px ${borderColor}4D` : undefined,
      }}
      className={cn(
        "group flex w-full flex-col items-center justify-center gap-2 rounded-[10px] px-2 pt-4 pb-3 transition-all",
        "min-w-[68px] sm:min-w-[84px]",
        isInteractive && "cursor-pointer",
        !active && isInteractive && "hover:[&_.cat-icon]:opacity-90 hover:[&_.cat-label]:opacity-90",
        comingSoon && "opacity-40 cursor-not-allowed",
        disabled && !comingSoon && "opacity-50 cursor-not-allowed"
      )}
    >
      <span
        className="cat-icon flex items-center justify-center transition-opacity"
        style={{ width: 24, height: 24, opacity: active ? 1 : 0.7 }}
      >
        <CategoryIcon
          category={category}
          size={category === "imprint" ? 18 : 24}
          color="#B8860B"
        />
      </span>
      <span
        className="cat-label transition-opacity"
        style={{
          fontFamily: "Jost, sans-serif",
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: active ? "#2C3E50" : "rgba(255,255,255,0.70)",
          opacity: 1,
        }}
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
