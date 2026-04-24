import { useRef } from "react";
import { Camera, X } from "lucide-react";

interface Props {
  file: File | null;
  preview: string | null;
  onSelect: (file: File | null) => void;
  expanded?: boolean;
}

const PhotoUpload = ({ file, preview, onSelect, expanded = true }: Props) => {
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

  // Collapsed: 44px, non-interactive. Expanded: full height, interactive.
  // Both states share the same dashed gold border, ivory inset background,
  // and Old Gold camera + label.
  const isInteractive = expanded;

  return (
    <button
      type="button"
      aria-disabled={!isInteractive}
      tabIndex={isInteractive ? 0 : -1}
      onClick={() => {
        if (!isInteractive) return;
        inputRef.current?.click();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed overflow-hidden transition-[height,padding] duration-300 ease-in-out"
      style={{
        height: expanded ? 128 : 44,
        borderColor: "#B8860B",
        backgroundColor: "#E8E4D8",
        color: "#B8860B",
        cursor: isInteractive ? "pointer" : "default",
      }}
    >
      <Camera className="h-5 w-5" style={{ color: "#B8860B" }} />
      <span className="font-jost text-base" style={{ color: "#B8860B" }}>
        Add a photo
      </span>
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
