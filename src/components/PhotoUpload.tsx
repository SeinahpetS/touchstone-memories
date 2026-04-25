import { useRef, useState } from "react";
import { Camera, X } from "lucide-react";

interface Props {
  file: File | null;
  preview: string | null;
  onSelect: (file: File | null) => void;
}

const PhotoUpload = ({ file, preview, onSelect }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onSelect(f);
  };

  const clear = () => {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) onSelect(f);
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
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDragging(false);
      }}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed py-8 transition-colors ${
        isDragging
          ? "border-foreground/60 bg-foreground/5 text-foreground"
          : "border-border bg-card text-muted-foreground hover:border-foreground/30"
      }`}
    >
      <Camera className="h-5 w-5" />
      <span className="text-base">
        {isDragging ? "Drop photo to upload" : "Add a photo or drag & drop"}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
};

export default PhotoUpload;
