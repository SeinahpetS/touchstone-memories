import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ProfileAvatarButton = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("avatar_url, name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;
      setAvatarUrl(data.avatar_url ?? null);
      setName(data.name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) return null;

  const initial =
    (name?.trim()?.[0] ?? user.email?.[0] ?? "U").toUpperCase();

  return (
    <button
      type="button"
      onClick={() => navigate("/profile")}
      aria-label="Open profile"
      className="rounded-full ring-2 ring-[hsl(var(--gold)/0.6)] ring-offset-2 ring-offset-background hover:ring-[hsl(var(--gold))] transition-all"
    >
      <Avatar className="h-9 w-9">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? "​"} /> : null}
        <AvatarFallback className="bg-[hsl(var(--dark-card))] text-[hsl(var(--label-color))] text-sm">
          {avatarUrl ? <UserIcon className="h-4 w-4" /> : initial}
        </AvatarFallback>
      </Avatar>
    </button>
  );
};

export default ProfileAvatarButton;
