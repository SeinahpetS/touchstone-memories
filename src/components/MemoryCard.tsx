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
  const [confirmOpen, setConfirmOpen] = useState(false);
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
      className="group relative w-full text-left rounded-lg overflow-hidden bg-card transition-colors hover:bg-border"
    >
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
      >
        <div className="p-4 space-y-2">
          {/* Category icon + label */}
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center rounded-md bg-[hsl(var(--dark-card))] p-1">
              <CategoryIcon category={cat} size={16} />
            </span>
            <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground">
              {CATEGORY_LABELS[cat] ?? memory.category}
            </span>
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
