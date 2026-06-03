import { useState } from "react";
import { MoreHorizontal, Pencil, Lock, Unlock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CategoryIcon, { CATEGORY_LABELS, CATEGORY_BORDER_COLORS, type CategoryKey } from "@/components/CategoryIcon";
import MemoryPhoto from "@/components/MemoryPhoto";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatMemoryDate } from "@/lib/memoryDate";

interface Props {
  memory: {
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
    when_text?: string | null;
    is_private?: boolean | null;
  };
  onClick?: () => void;
  onChanged?: () => void;
  /** Retained for API compatibility — no longer affects layout. */
  pairedWithPhoto?: boolean;
}

/**
 * Standard memory card used across archive grid, timeline, and any other view.
 *
 * Structure (per design spec):
 *   - Card bg #E8E4D8, radius 12px
 *   - Photo area: full-width 1:1 square. With photo → full bleed.
 *     Without photo → bg #E4E2DC + centered 52px dark navy icon tile.
 *   - 3px full-width category bar in category color.
 *   - Body: padding 10px, 22px icon tile + caps category label,
 *     Playfair title, muted Jost date.
 */
const MemoryCard = ({ memory, onClick, onChanged }: Props) => {
  const cat = memory.category as CategoryKey;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isPrivate = !!memory.is_private;
  const barColor = CATEGORY_BORDER_COLORS[cat] ?? "#B8860B";

  const togglePrivacy = async () => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("touchstones")
      .update({ is_private: !isPrivate })
      .eq("id", memory.id);
    setBusy(false);
    if (error) {
      toast.error(error.message || "Couldn't update privacy.");
      return;
    }
    toast.success(isPrivate ? "Made public." : "Made private.");
    onChanged?.();
  };

  const handleDelete = async () => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("touchstones")
      .delete()
      .eq("id", memory.id);
    setBusy(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message || "Couldn't delete that Touchstone.");
      return;
    }
    toast.success("Touchstone deleted.");
    onChanged?.();
  };

  const memoryDateLabel =
    (memory.when_text && memory.when_text.trim()) ||
    formatMemoryDate({
      season: (memory.memory_season as any) ?? null,
      year: memory.memory_year ?? null,
      month: memory.memory_month ?? null,
      day: memory.memory_day ?? null,
    });

  return (
    <div
      className="group relative w-full text-left overflow-hidden transition-colors"
      style={{ backgroundColor: "#E8E4D8", borderRadius: 12 }}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
      >
        {/* Photo / icon-fallback frame — 1:1 square */}
        {memory.photo_url ? (
          <div style={{ aspectRatio: "1 / 1", width: "100%", overflow: "hidden" }}>
            <MemoryPhoto
              src={memory.photo_url}
              alt={memory.title || "Memory"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center",
                display: "block",
              }}
            />
          </div>
        ) : (
          <div
            aria-hidden
            style={{
              aspectRatio: "1 / 1",
              width: "100%",
              backgroundColor: "#E4E2DC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                width: 52,
                height: 52,
                borderRadius: 10,
                backgroundColor: "#2C3E50",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon category={cat} size={28} color="#B8860B" />
            </span>
          </div>
        )}

        {/* 3px category bar */}
        <div
          aria-hidden
          style={{
            height: 9,
            width: "100%",
            backgroundColor: barColor,
          }}
        />

        {/* Body */}
        <div style={{ padding: 10 }} className="space-y-1.5">
          {/* Category icon tile (22px) + label in caps */}
          <div className="flex items-center gap-1.5">
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 5,
                backgroundColor: "#2C3E50",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CategoryIcon category={cat} size={14} color="#B8860B" />
            </span>
            <span
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8A8070",
              }}
            >
              {CATEGORY_LABELS[cat] ?? memory.category}
            </span>
          </div>

          {memory.title && (
            <h3
              className="line-clamp-1"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#2C3E50",
                margin: 0,
              }}
            >
              {memory.title}
            </h3>
          )}
          {memoryDateLabel && (
            <p
              style={{
                fontFamily: "Jost, sans-serif",
                fontSize: 11,
                fontWeight: 300,
                color: "rgba(91,74,63,0.6)",
                margin: 0,
              }}
            >
              {memoryDateLabel}
            </p>
          )}
        </div>
      </button>

      {/* Hover-state action menu */}
      <div
        className={cn(
          "absolute top-2 right-2 transition-opacity",
          menuOpen
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
        )}
      >
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            aria-label="Entry options"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/85 backdrop-blur-sm text-foreground shadow-sm hover:bg-background transition-colors"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem
              onClick={() => navigate(`/?edit=${memory.id}`)}
              className="cursor-pointer"
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={togglePrivacy}
              disabled={busy}
              className="cursor-pointer"
            >
              {isPrivate ? (
                <>
                  <Unlock className="mr-2 h-4 w-4" />
                  Make Public
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Make Private
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                setConfirmOpen(true);
              }}
              disabled={busy}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Touchstone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove
              {memory.title ? ` "${memory.title}"` : " this entry"} from your
              Constellation. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MemoryCard;
