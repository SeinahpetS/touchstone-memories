import { useState } from "react";
import { MoreHorizontal, Pencil, Lock, Unlock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CategoryIcon, { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
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

const CATEGORY_STRIPE: Record<string, string> = {
  moment: "bg-gold",
  object: "bg-pewter",
  person: "bg-plum",
  place: "bg-malachite",
  food: "bg-terracotta",
  sound: "bg-blueprint",
  imprint: "bg-ink",
};

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

const MemoryCard = ({ memory, onClick, onChanged }: Props) => {
  const cat = memory.category as CategoryKey;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const isPrivate = !!memory.is_private;

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

  return (
    <div
      className="group relative w-full text-left rounded-lg overflow-hidden bg-card transition-colors hover:bg-border"
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
      >
        {/* Category stripe */}
        <div className={cn("h-1.5", CATEGORY_STRIPE[memory.category] || "bg-foreground")} />

        {memory.photo_url && (
          <img
            src={memory.photo_url}
            alt={memory.title || "Memory"}
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        )}

        <div className="p-4 space-y-2">
          {/* Category icon + label */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--dark-card))] p-1">
              <CategoryIcon category={cat} size={16} />
            </span>
            <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {CATEGORY_LABELS[cat] ?? memory.category}
            </span>
            {isPrivate && (
              <Lock className="h-3 w-3 text-muted-foreground" aria-label="Private" />
            )}
          </div>

          {memory.title && (
            <h3 className="font-playfair text-base font-semibold text-foreground line-clamp-1">
              {memory.title}
            </h3>
          )}
          {(() => {
            const memoryDateLabel = formatMemoryDate({
              season: (memory.memory_season as any) ?? null,
              year: memory.memory_year ?? null,
              month: memory.memory_month ?? null,
              day: memory.memory_day ?? null,
            });
            return memoryDateLabel ? (
              <p className="font-jost text-xs font-light text-[#5B4A3F]/60">
                {memoryDateLabel}
              </p>
            ) : null;
          })()}
          {memory.note && (
            <p className="text-sm text-muted-foreground line-clamp-2">{memory.note}</p>
          )}
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default MemoryCard;
