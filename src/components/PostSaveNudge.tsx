import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import MemoryDateInput from "@/components/MemoryDateInput";
import { emptyMemoryDate, type MemoryDate } from "@/lib/memoryDate";

interface Props {
  memoryId: string;
  hasDate: boolean;
  hasPeople: boolean;
  initialDate: MemoryDate;
  onPatched?: (patch: {
    memory_season?: string | null;
    memory_year?: number | null;
    memory_month?: number | null;
    memory_day?: number | null;
    people?: string | null;
  }) => void;
}

type ExpandedField = "date" | "people" | null;

/**
 * Soft, dismissible nudge shown beneath a saved memory artifact when
 * optional fields (date or people) are blank. Inline, non-blocking.
 */
const PostSaveNudge = ({
  memoryId,
  hasDate,
  hasPeople,
  initialDate,
  onPatched,
}: Props) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState<ExpandedField>(null);

  const [showDate, setShowDate] = useState(!hasDate);
  const [showPeople, setShowPeople] = useState(!hasPeople);

  const [memoryDate, setMemoryDate] = useState<MemoryDate>(
    initialDate ?? emptyMemoryDate()
  );
  const [people, setPeople] = useState("");

  // Fade in 300ms after mount (artifact is already on screen).
  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 50);
    return () => window.clearTimeout(t);
  }, []);

  if (dismissed) return null;
  if (!showDate && !showPeople) return null;

  const saveDate = async () => {
    const patch = {
      memory_season: memoryDate.season,
      memory_year: memoryDate.year,
      memory_month: memoryDate.month,
      memory_day: memoryDate.day,
    };
    const { error } = await (supabase as any)
      .from("touchstones")
      .update(patch)
      .eq("id", memoryId);
    if (error) {
      toast.error("Couldn't save that date.");
      return;
    }
    onPatched?.(patch);
    setExpanded(null);
    // If user filled at least one piece, hide this row.
    if (memoryDate.season || memoryDate.year) setShowDate(false);
  };

  const savePeople = async () => {
    const value = people.trim();
    const { error } = await (supabase as any)
      .from("touchstones")
      .update({ people: value || null })
      .eq("id", memoryId);
    if (error) {
      toast.error("Couldn't save that.");
      return;
    }
    onPatched?.({ people: value || null });
    setExpanded(null);
    if (value) setShowPeople(false);
  };

  return (
    <section
      className={
        "mt-12 space-y-5 transition-opacity duration-300 ease-out " +
        (visible ? "opacity-100" : "opacity-0")
      }
      aria-label="Add more to this memory"
    >
      <div className="space-y-4">

        {showDate && (
          <div>
            {expanded === "date" ? (
              <div className="space-y-3">
                <MemoryDateInput value={memoryDate} onChange={setMemoryDate} />
                <button
                  type="button"
                  onClick={saveDate}
                  className="font-jost text-sm text-[#B8860B] hover:opacity-80 transition-opacity"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setExpanded("date")}
                className="font-jost text-[14px] text-[#4A6B8A] hover:opacity-80 transition-opacity text-left"
              >
                When does this take you back to?
              </button>
            )}
          </div>
        )}

        {showPeople && (
          <div>
            {expanded === "people" ? (
              <div className="space-y-3">
                <input
                  type="text"
                  autoFocus
                  value={people}
                  onChange={(e) => setPeople(e.target.value)}
                  placeholder="Who else was there?"
                  className="h-11 w-full rounded-md bg-[#E8E4D8] border-0 px-3 text-base font-jost text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--gold))] focus:ring-offset-0 transition-shadow"
                />
                <button
                  type="button"
                  onClick={savePeople}
                  className="font-jost text-sm text-[#B8860B] hover:opacity-80 transition-opacity"
                >
                  Done
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setExpanded("people")}
                className="font-jost text-[14px] text-[#4A6B8A] hover:opacity-80 transition-opacity text-left"
              >
                Anyone else in this memory?
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="font-jost text-sm text-[#2C3E50]/70 hover:text-[#2C3E50] transition-colors"
      >
        All done
      </button>
    </section>
  );
};

export default PostSaveNudge;
