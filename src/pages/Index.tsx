import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Wordmark from "@/components/Wordmark";
import PromptCard from "@/components/PromptCard";
import PhotoUpload from "@/components/PhotoUpload";
import CategorySelector from "@/components/CategorySelector";
import SentimentPill from "@/components/SentimentPill";
import MemoryArtifact from "@/components/MemoryArtifact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState("moment");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [sentiment, setSentiment] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<any>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  const handlePhotoSelect = (file: File | null) => {
    setPhotoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    } else {
      setPhotoPreview(null);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    if (!note.trim() && !title.trim() && !photoFile) {
      toast.error("Add a photo, title, or note to save a memory.");
      return;
    }

    setSaving(true);
    try {
      let photo_url: string | null = null;

      if (photoFile) {
        const ext = photoFile.name.split(".").pop();
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("memory-photos")
          .upload(path, photoFile);
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("memory-photos").getPublicUrl(path);
        photo_url = data.publicUrl;
      }

      const { data, error } = await supabase
        .from("memories")
        .insert({
          user_id: user.id,
          category: category as any,
          title: title.trim() || null,
          note: note.trim() || null,
          sentiment: sentiment || null,
          photo_url,
        })
        .select()
        .single();

      if (error) throw error;
      setSaved(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to save memory.");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setSaved(null);
    setCategory("moment");
    setTitle("");
    setNote("");
    setSentiment("");
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-lg px-5 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Wordmark />
          <button
            onClick={() => navigate("/archive")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Archive
          </button>
        </div>

        {saved ? (
          <MemoryArtifact
            photoUrl={saved.photo_url}
            category={saved.category}
            title={saved.title}
            note={saved.note}
            createdAt={saved.created_at}
            onClose={reset}
          />
        ) : (
          <>
            <PromptCard />

            <PhotoUpload
              file={photoFile}
              preview={photoPreview}
              onSelect={handlePhotoSelect}
            />

            <CategorySelector value={category} onChange={setCategory} />

            <Input
              type="text"
              placeholder="Give this memory a name (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12 text-base bg-card border-0"
            />

            <Textarea
              placeholder="What do you want to remember about this?"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[120px] text-base bg-card border-0 resize-none"
            />

            <SentimentPill value={sentiment} onChange={setSentiment} />

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-14 text-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? "Saving…" : "Save to archive"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
