import { useEffect, useRef, useState } from "react";
import { ImagePlus, Crop, ArrowLeftRight, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import Cropper, { type Area } from "react-easy-crop";
import { cropPhotoBlob } from "@/lib/cropPhoto";
import { Button } from "@/components/ui/button";
import CategoryIcon, { CATEGORY_LABELS, CategoryIconCard, type CategoryKey } from "@/components/CategoryIcon";
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
  const [original, setOriginal] = useState<Blob | null>(null);
  const [aspect, setAspect] = useState(1);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const applyCrop = async () => {
    const src = originalUrl ?? preview;
    if (!src || !area) { setAdjusting(false); return; }
    setBusy(true);
    try { setPhoto(await cropPhotoBlob(src, area)); setAdjusting(false); setCrop({ x: 0, y: 0 }); setZoom(1); }
    catch { toast.error("Couldn't adjust this photo. Please try again."); }
    finally { setBusy(false); }
  };
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    if (artifact.photoKey) void readOnboardingPhoto(artifact.photoKey).then(async blob => {
      if (!active || !blob) return;
      setPhoto(blob);
      const orig = artifact.originalPhotoKey ? await readOnboardingPhoto(artifact.originalPhotoKey).catch(() => null) : null;
      if (active) setOriginal(orig ?? blob);
    }).catch(() => toast.error("Couldn't load your photo."));
    return () => { active = false; };
  }, [artifact.photoKey, artifact.originalPhotoKey]);
  useEffect(() => {
    if (!original) { setOriginalUrl(null); return; }
    const url = URL.createObjectURL(original);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [original]);
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
    let origKey: string | undefined;
    try {
      if (photo && !removed) {
        newKey = crypto.randomUUID();
        await storeOnboardingPhoto(newKey, photo);
        if (original && original !== photo) {
          origKey = crypto.randomUUID();
          await storeOnboardingPhoto(origKey, original);
        }
      }
      onSave({ ...artifact, title, category, note, photoKey: newKey, originalPhotoKey: origKey });
    } catch {
      if (newKey) void removeOnboardingPhoto(newKey);
      if (origKey) void removeOnboardingPhoto(origKey);
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
        try { const b = await resizeOnboardingPhoto(file); setPhoto(b); setOriginal(b); setRemoved(false); }
        catch { toast.error("Couldn't open this photo. Please choose a supported still image."); }
        finally { setBusy(false); }
      }} />
      {preview && !removed ? <div>
        {adjusting ? <>
          <div className="onboarding-crop-frame">
            <Cropper image={originalUrl ?? preview} objectFit="contain" crop={crop} zoom={zoom} aspect={aspect} minZoom={1} maxZoom={4}
              onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />
          </div>
          <div className="onboarding-crop-ratios" role="group" aria-label="Photo shape">
            {([["Landscape", 4 / 3], ["Portrait", 3 / 4], ["Square", 1]] as const).map(([label, r]) =>
              <button key={label} type="button" aria-pressed={aspect === r} onClick={() => setAspect(r)}>{label}</button>)}
          </div>
          <p className="onboarding-crop-hint">Drag to move · pinch or slide to zoom</p>
          <input type="range" aria-label="Zoom" min={1} max={4} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="onboarding-crop-zoom" />
          <div className="flex justify-center gap-3 mt-3">
            <Button variant="outline" className="rounded-full px-8 bg-transparent" disabled={busy} onClick={() => { setAdjusting(false); setCrop({ x: 0, y: 0 }); setZoom(1); }}>Cancel</Button>
            <Button className="rounded-full px-8" disabled={busy} onClick={() => void applyCrop()}>Done</Button>
          </div>
        </> : <>
        <img src={preview} alt="Touchstone photo preview" className="onboarding-edit-photo" />
        <div className="flex justify-center gap-3 mt-3"><Button variant="outline" size="icon" aria-label="Crop and move photo" title="Crop & move" className="rounded-full bg-transparent" disabled={busy} onClick={() => setAdjusting(true)}><Crop size={18} /></Button>
          <Button variant="outline" size="icon" aria-label="Replace photo" title="Replace" className="rounded-full bg-transparent" disabled={busy} onClick={() => inputRef.current?.click()}><ArrowLeftRight size={18} /></Button>
          <Button variant="outline" size="icon" aria-label="Remove photo" title="Remove" className="rounded-full bg-transparent" disabled={busy} onClick={() => { setPhoto(null); setRemoved(true); }}><Trash2 size={18} /></Button>
          {original && original !== photo && <Button variant="outline" size="icon" aria-label="Revert to original photo" title="Revert to original" className="rounded-full bg-transparent" disabled={busy} onClick={() => setPhoto(original)}><Undo2 size={18} /></Button>}</div>
        </>}
      </div> : <Button variant="outline" className="onboarding-add-photo" disabled={busy} onClick={() => inputRef.current?.click()}><ImagePlus size={20} />Add a photo</Button>}
      {!adjusting && <>
      <label className="onboarding-edit-field">Title<input aria-label="Title" className="onboarding-edit-title" value={title} onChange={e => setTitle(e.target.value)} /></label>
      <div className="onboarding-edit-field">Category
        <Button variant="outline" className="onboarding-category-chip" aria-expanded={categoriesOpen} onClick={() => setCategoriesOpen(v => !v)}><CategoryIcon category={category as CategoryKey} size={23} color="#B8860B" className="!size-[23px]" />{CATEGORY_LABELS[category as CategoryKey]}</Button>
        {categoriesOpen && <div className="onboarding-category-options">{(Object.keys(CATEGORY_LABELS) as CategoryKey[]).map(key =>
          <CategoryIconCard key={key} category={key} className="w-full h-full !min-w-0 !px-[6px] !py-[14px] !gap-1.5 text-center" iconSize={26} labelSize={10} active={category === key} selectionRing onClick={() => { setCategory(key); setCategoriesOpen(false); }} />)}</div>}
      </div>
      <label className="onboarding-edit-field">Note<textarea aria-label="Note" rows={3} className="onboarding-edit-note" value={note} onChange={e => setNote(e.target.value)} /></label>
      <Button className="onboarding-edit-save" disabled={busy || adjusting} onClick={() => void save()}>Save</Button>
      <Button variant="ghost" className="onboarding-edit-cancel" disabled={busy} onClick={onCancel}>Cancel</Button>
      </>}
    </div>
  </div>;
}