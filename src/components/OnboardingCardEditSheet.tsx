import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS, type CategoryKey } from "@/components/CategoryIcon";
import type { StoryArtifact } from "@/lib/onboardingStoryDraft";
import { readOnboardingPhoto, resizeOnboardingPhoto, storeOnboardingPhoto, removeOnboardingPhoto } from "@/lib/onboardingPhotos";

export default function OnboardingCardEditSheet({ artifact, onSave, onCancel }: {
  artifact: StoryArtifact;
  onSave: (artifact: StoryArtifact) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(artifact.title);
  const [note, setNote] = useState(artifact.note);
  const [category, setCategory] = useState(artifact.category);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (artifact.photoKey) void readOnboardingPhoto(artifact.photoKey).then(blob => { if (active && blob) setPhoto(blob); }).catch(() => toast.error("Couldn't load your photo."));
    return () => { active = false; };
  }, [artifact.photoKey]);
  useEffect(() => {
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  useEffect(() => {
    dialogRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  const save = async () => {
    setBusy(true);
    let newKey: string | undefined;
    try {
      if (photo && !removed) {
        newKey = crypto.randomUUID();
        await storeOnboardingPhoto(newKey, photo);
      }
      onSave({ ...artifact, title, category, note, photoKey: newKey });
    } catch {
      if (newKey) void removeOnboardingPhoto(newKey);
      toast.error("Couldn't save your changes on this device. Please try again.");
    } finally { setBusy(false); }
  };

  return <div className="onboarding-edit-backdrop" onClick={() => { if (!busy) onCancel(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Edit Touchstone" tabIndex={-1} className="onboarding-edit-sheet"
      onClick={e => e.stopPropagation()} onKeyDown={e => {
        if (e.key === "Escape" && !busy) onCancel();
        if (e.key === "Tab") {
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type="file"]), textarea');
          const first = controls?.[0], last = controls?.[controls.length - 1];
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last?.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
        }
      }}>
      <input ref={inputRef} className="hidden" type="file" accept="image/*" aria-label="Choose photo" onChange={async e => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setBusy(true);
        try { setPhoto(await resizeOnboardingPhoto(file)); setRemoved(false); }
        catch { toast.error("Couldn't open this photo. Please choose a supported still image."); }
        finally { setBusy(false); }
      }} />
      {preview && !removed ? <div>
        <img src={preview} alt="Touchstone photo preview" className="onboarding-edit-photo" />
        <div className="flex gap-3"><Button variant="ghost" className="onboarding-edit-text" disabled={busy} onClick={() => inputRef.current?.click()}>Replace</Button>
          <Button variant="ghost" className="onboarding-edit-text" disabled={busy} onClick={() => { setPhoto(null); setRemoved(true); }}>Remove</Button></div>
      </div> : <Button variant="outline" className="onboarding-add-photo" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus size={20} />Add a photo</Button>}
      <label className="onboarding-edit-field">Title<input aria-label="Title" className="onboarding-edit-title" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div className="onboarding-edit-field">Category
        <Button variant="outline" className="onboarding-category-chip" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen(v => !v)}>{CATEGORY_LABELS[category]}</Button>
        {categoriesOpen && <div className="onboarding-category-options">{(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key =>
          <Button key={key} variant="ghost" aria-pressed={category === key} onClick={() => { setCategory(key); setCategoriesOpen(false); }}>{CATEGORY_LABELS[key]}</Button>)}</div>}
      </div>
      <label className="onboarding-edit-field">Note<textarea aria-label="Note" rows={5} className="onboarding-edit-note" value={note} onChange={e => setNote(e.target.value)} /></label>
      <Button className="onboarding-edit-save" disabled={busy} onClick={() => void save()}>Save</Button>
      <Button variant="ghost" className="onboarding-edit-cancel" disabled={busy} onClick={onCancel}>Cancel</Button>
    </div>
  </div>;
}