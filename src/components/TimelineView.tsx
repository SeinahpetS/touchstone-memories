import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import MemoryCard from "@/components/MemoryCard";

interface Memory {
  id: string;
  category: string;
  title?: string | null;
  note?: string | null;
  photo_url?: string | null;
  created_at: string;
  memory_season?: string | null;
  memory_year?: number | null;
  memory_month?: number | null;
  memory_day?: number | null;
  is_private?: boolean | null;
}

interface TimelineViewProps {
  memories: Memory[];
  onSelect: (m: Memory) => void;
  onChanged: () => void;
}

const NODE_COLORS = ["#2C3E50", "#4A6B8A", "#8B3A62", "#2E7D5E"];

const sizeForCount = (n: number) => {
  if (n >= 20) return 52;
  if (n >= 10) return 44;
  if (n >= 5) return 36;
  return 28;
};

const memoryYear = (m: Memory): number => {
  if (m.memory_year) return m.memory_year;
  return new Date(m.created_at).getFullYear();
};

const decadeOf = (year: number) => Math.floor(year / 10) * 10;

const seasonYearLabel = (m: Memory) => {
  const y = memoryYear(m);
  if (m.memory_season) {
    const s = m.memory_season.charAt(0).toUpperCase() + m.memory_season.slice(1);
    return `${s} ${y}`;
  }
  const d = new Date(m.created_at);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

const TimelineView = ({ memories, onSelect, onChanged }: TimelineViewProps) => {
  const [openDecades, setOpenDecades] = useState<Record<number, boolean>>({});
  const [openYears, setOpenYears] = useState<Record<number, boolean>>({});

  const { decades, earliest } = useMemo(() => {
    const byDecade = new Map<number, Memory[]>();
    memories.forEach((m) => {
      const d = decadeOf(memoryYear(m));
      if (!byDecade.has(d)) byDecade.set(d, []);
      byDecade.get(d)!.push(m);
    });
    const sortedDecades = Array.from(byDecade.entries())
      .map(([decade, items]) => ({ decade, items }))
      .sort((a, b) => a.decade - b.decade);

    let earliestMem: Memory | null = null;
    memories.forEach((m) => {
      if (!earliestMem || memoryYear(m) < memoryYear(earliestMem)) earliestMem = m;
    });

    return { decades: sortedDecades, earliest: earliestMem };
  }, [memories]);

  const presentYear = new Date().getFullYear();
  const rangeLabel = earliest
    ? `${seasonYearLabel(earliest)} — Present`
    : `Present`;

  const toggleDecade = (d: number) =>
    setOpenDecades((s) => ({ ...s, [d]: !s[d] }));
  const toggleYear = (y: number) =>
    setOpenYears((s) => ({ ...s, [y]: !s[y] }));

  // Spine offset: nodes are centered at left=24 (px). Spine line at left:24px width:1px.
  const SPINE_LEFT = 24;

  return (
    <div className="pb-8">
      <p
        style={{
          fontFamily: "'Source Sans 3', sans-serif",
          fontSize: "13px",
          color: "#B8860B",
          letterSpacing: "0.04em",
          margin: "0 0 20px 0",
        }}
      >
        {rangeLabel}
      </p>

      <div className="relative">
        {/* Spine — drawn from first node center to last node center */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            left: SPINE_LEFT,
            top: 26, // approx half of largest node so it begins at first node center
            bottom: 18, // half of present node (36/2)
            width: 1,
            backgroundColor: "#B8860B",
            transform: "translateX(-0.5px)",
          }}
        />

        <div className="space-y-6">
          {decades.map(({ decade, items }, i) => {
            const size = sizeForCount(items.length);
            const bg = NODE_COLORS[i % NODE_COLORS.length];
            const isOpen = !!openDecades[decade];

            // Group by year within decade
            const byYear = new Map<number, Memory[]>();
            items.forEach((m) => {
              const y = memoryYear(m);
              if (!byYear.has(y)) byYear.set(y, []);
              byYear.get(y)!.push(m);
            });
            const years = Array.from(byYear.entries())
              .map(([year, list]) => ({ year, list }))
              .sort((a, b) => a.year - b.year);

            return (
              <div key={decade} className="relative">
                <button
                  type="button"
                  onClick={() => toggleDecade(decade)}
                  className="flex items-center gap-4 w-full text-left"
                >
                  <span
                    style={{
                      width: size,
                      height: size,
                      borderRadius: "50%",
                      backgroundColor: bg,
                      color: "#FFFFFF",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "Jost, sans-serif",
                      fontSize: size >= 44 ? 16 : 13,
                      fontWeight: 500,
                      flexShrink: 0,
                      marginLeft: SPINE_LEFT - size / 2,
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    {items.length}
                  </span>
                  <span className="flex-1">
                    <span
                      style={{
                        display: "block",
                        fontFamily: "Jost, sans-serif",
                        fontWeight: 500,
                        fontSize: 16,
                        color: "#2C3E50",
                      }}
                    >
                      {decade}s
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "'Source Sans 3', sans-serif",
                        fontSize: 12,
                        color: "#8A8070",
                        marginTop: 2,
                      }}
                    >
                      {items.length} {items.length === 1 ? "memory" : "memories"} · tap to {isOpen ? "collapse" : "expand"}
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-4 space-y-4">
                    {years.map(({ year, list }) => {
                      const yOpen = !!openYears[year];
                      return (
                        <div key={year} className="relative">
                          <button
                            type="button"
                            onClick={() => toggleYear(year)}
                            className="flex items-center gap-4 w-full text-left"
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                backgroundColor: "#B8860B",
                                flexShrink: 0,
                                marginLeft: SPINE_LEFT - 4,
                                position: "relative",
                                zIndex: 1,
                              }}
                            />
                            <span className="flex-1 flex items-center justify-between">
                              <span className="flex items-baseline gap-3">
                                <span
                                  style={{
                                    fontFamily: "Jost, sans-serif",
                                    fontWeight: 500,
                                    fontSize: 15,
                                    color: "#2C3E50",
                                  }}
                                >
                                  {year}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "'Source Sans 3', sans-serif",
                                    fontSize: 12,
                                    color: "#8A8070",
                                  }}
                                >
                                  {list.length} {list.length === 1 ? "memory" : "memories"}
                                </span>
                              </span>
                              {yOpen ? (
                                <ChevronDown size={16} color="#8A8070" />
                              ) : (
                                <ChevronRight size={16} color="#8A8070" />
                              )}
                            </span>
                          </button>

                          {yOpen && (
                            <div
                              className="grid grid-cols-2 gap-3 mt-3"
                              style={{ marginLeft: SPINE_LEFT + 16 }}
                            >
                              {list.map((m, idx) => {
                                const rowStart = idx - (idx % 2);
                                const partner = list[rowStart === idx ? idx + 1 : rowStart];
                                const hasPhoto = !!m.photo_url;
                                const partnerHasPhoto = !!partner?.photo_url;
                                const pairedWithPhoto = !hasPhoto && partnerHasPhoto;
                                return (
                                  <MemoryCard
                                    key={m.id}
                                    memory={m}
                                    pairedWithPhoto={pairedWithPhoto}
                                    onClick={() => onSelect(m)}
                                    onChanged={onChanged}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Present node */}
          <div className="relative flex items-center gap-4">
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                backgroundColor: "#F2EEE5",
                border: "1.5px solid #B8860B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                marginLeft: SPINE_LEFT - 18,
                position: "relative",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#B8860B",
                }}
              />
            </span>
            <span className="flex items-baseline gap-3">
              <span
                style={{
                  fontFamily: "Jost, sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "#B8860B",
                }}
              >
                Present
              </span>
              <span
                style={{
                  fontFamily: "'Source Sans 3', sans-serif",
                  fontSize: 13,
                  color: "#8A8070",
                }}
              >
                {presentYear}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
