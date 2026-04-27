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

const MAT_BG = "#F5F0E8";
const NAVY = "#2C3E50";
const GOLD = "#B8860B";

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
      className="group relative w-full text-left overflow-hidden"
      style={{ borderRadius: "12px" }}
    >
      <button type="button" onClick={onClick} className="w-full text-left block">
        {/* BODY ZONE — cream mat */}
        <div
          style={{
            background: MAT_BG,
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0 0 0 1px rgba(184, 134, 11, 0.40)",
          }}
        >
          {memory.photo_url ? (
            <img
              src={memory.photo_url}
              alt={memory.title || "Memory"}
              className="w-full block object-cover"
              style={{ borderRadius: "2px", aspectRatio: "4 / 3" }}
              loading="lazy"
            />
          ) : (
            <div
              className="w-full flex items-center justify-center"
              style={{
                background: NAVY,
                borderRadius: "2px",
                aspectRatio: "4 / 3",
              }}
            >
              <CategoryIcon
                category={cat}
                size={40}
                color={GOLD}
                className="[&_*]:[stroke-width:1.2px]"
              />
            </div>
          )}
        </div>

        {/* FOOTER ZONE */}
        <div
          className="relative"
          style={{
            background: NAVY,
            padding: "9px 12px 11px",
            borderBottomLeftRadius: "12px",
            borderBottomRightRadius: "12px",
          }}
        >
          <div
            className="font-jost uppercase"
            style={{
              fontSize: "8px",
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.60)",
            }}
          >
            {CATEGORY_LABELS[cat] ?? memory.category}
          </div>
          {memory.title && (
            <h3
              className="font-playfair font-semibold"
              style={{
                fontSize: "12px",
                color: "#ffffff",
                lineHeight: 1.3,
                paddingRight: "24px",
                marginTop: "2px",
              }}
            >
              {memory.title}
            </h3>
          )}
          <span
            style={{
              position: "absolute",
              bottom: "10px",
              right: "10px",
              opacity: 0.75,
              display: "inline-flex",
            }}
          >
            <CategoryIcon
              category={cat}
              size={20}
              color={GOLD}
              className="[&_*]:[stroke-width:1.4px]"
            />
          </span>
          {isPrivate && (
            <Lock
              className="absolute"
              style={{ top: "9px", right: "10px", color: "rgba(255,255,255,0.55)" }}
              size={10}
              aria-label="Private"
            />
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
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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
