import { useState } from "react";
import { MoreHorizontal, Pencil, Lock, Unlock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABELS, CATEGORY_BORDER_COLORS, type CategoryKey } from "@/components/CategoryIcon";
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
    is_private?: boolean | null;
  };
  onClick?: () => void;
  onChanged?: () => void;
}

/**
 * MemoryGlyph — locked card icon set per spec.
 * Used in both no-photo center field (40px) and footer corner (20px).
 */
const MemoryGlyph = ({
  category,
  size,
  strokeWidth,
  opacity,
}: {
  category: CategoryKey;
  size: number;
  strokeWidth: number;
  opacity?: number;
}) => {
  const stroke = "#B8860B";
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style: opacity != null ? { opacity } : undefined,
  };
  const key = (category === ("people" as any) ? "person" : category) as CategoryKey;

  switch (key) {
    case "moment":
      // Star polygon (5-point)
      return (
        <svg {...common}>
          <polygon points="12,2.5 14.6,9.3 21.8,9.6 16.1,14 18.1,21 12,17 5.9,21 7.9,14 2.2,9.6 9.4,9.3" />
        </svg>
      );
    case "person":
      // Circle head + arc body
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
      );
    case "object":
      // Box outline
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="1" />
        </svg>
      );
    case "place":
      // Map pin outline
      return (
        <svg {...common}>
          <path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
          <circle cx="12" cy="9" r="2.5" />
        </svg>
      );
    case "food":
      // Fork and knife
      return (
        <svg {...common}>
          {/* Fork */}
          <path d="M8 3v6" />
          <path d="M6 3v4a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" />
          <path d="M8 9v12" />
          {/* Knife */}
          <path d="M16 3c2 1 3 4 3 7s-1 4-3 4" />
          <path d="M16 14v7" />
        </svg>
      );
    case "sound":
      // Music note
      return (
        <svg {...common}>
          <path d="M9 18V5l11-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="17" cy="16" r="3" />
        </svg>
      );
    case "imprint":
      // Open book outline
      return (
        <svg {...common}>
          <path d="M12 6.5v13" />
          <path d="M3 5.5h6a3 3 0 0 1 3 3v11a2.5 2.5 0 0 0-2.5-2.5H3z" />
          <path d="M21 5.5h-6a3 3 0 0 0-3 3v11a2.5 2.5 0 0 1 2.5-2.5H21z" />
        </svg>
      );
  }
};

const MemoryCard = ({ memory, onClick, onChanged }: Props) => {
  const cat = memory.category as CategoryKey;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isPrivate = !!memory.is_private;

  const jewelTone = CATEGORY_BORDER_COLORS[cat] ?? "#2C3E50";
  const categoryLabel = CATEGORY_LABELS[cat] ?? memory.category;

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

  return (
    <div
      className="group relative w-full text-left overflow-hidden"
      style={{ borderRadius: "12px", backgroundColor: jewelTone }}
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left block"
      >
        {/* Body zone — cream mat */}
        <div
          style={{
            backgroundColor: "#F5F0E8",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0 0 0 1px rgba(184, 134, 11, 0.40)",
            margin: "0",
          }}
        >
          {memory.photo_url ? (
            <div
              style={{
                aspectRatio: "3 / 4",
                borderRadius: "2px",
                overflow: "hidden",
                width: "100%",
              }}
            >
              <img
                src={memory.photo_url}
                alt={memory.title || "Memory"}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                }}
                loading="lazy"
              />
            </div>
          ) : (
            <div
              style={{
                aspectRatio: "3 / 4",
                backgroundColor: "#2C3E50",
                borderRadius: "2px",
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MemoryGlyph category={cat} size={40} strokeWidth={1.2} />
            </div>
          )}
        </div>

        {/* Footer zone */}
        <div
          style={{
            position: "relative",
            padding: "9px 12px 11px",
          }}
        >
          <div
            style={{
              fontFamily: "Jost, sans-serif",
              fontSize: "8px",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.60)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span>{categoryLabel}</span>
            {isPrivate && (
              <Lock
                style={{ width: 10, height: 10, color: "rgba(255,255,255,0.60)" }}
                aria-label="Private"
              />
            )}
          </div>
          {memory.title && (
            <h3
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "#ffffff",
                lineHeight: 1.3,
                paddingRight: "24px",
                margin: "2px 0 0 0",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {memory.title}
            </h3>
          )}

          {/* Bottom-right category icon */}
          <div
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              lineHeight: 0,
            }}
          >
            <MemoryGlyph category={cat} size={20} strokeWidth={1.4} opacity={0.75} />
          </div>
        </div>
      </button>

      {/* Hover-state action menu — visible on hover, focus-within, or when open */}
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
