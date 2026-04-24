import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface Props {
  file: File | null;
  preview: string | null;
  onSelect: (file: File | null) => void;
}

const PhotoUpload = ({ file, preview, onSelect }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onSelect(f);
  };

  const clear = () => {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (preview) {
    return (
      <div className="relative rounded-lg overflow-hidden">
        <img src={preview} alt="Selected" className="w-full max-h-64 object-cover" />
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 rounded-full bg-foreground/70 text-background p-1.5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-card py-8 text-muted-foreground hover:border-foreground/30 transition-colors"
    >
      <Camera className="h-5 w-5" />
      <span className="text-base">Add a photo</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleChange}
        className="hidden"
      />
    </button>
  );
};

export default PhotoUpload;
