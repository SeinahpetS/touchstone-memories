import { useRef, useState } from "react";
import { AudioLines, X } from "lucide-react";

interface Props {
  file: File | null;
  onSelect: (file: File | null) => void;
}

const AudioUpload = ({ file, onSelect }: Props) => {
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
    if (f && f.type.startsWith("audio/")) onSelect(f);
  };

  return (
    <div>
      {file ? (
        <div className="relative flex w-full items-center justify-between gap-2 rounded-lg bg-card px-4 py-6">
          <div className="flex items-center gap-2 text-foreground">
            <AudioLines className="h-5 w-5" />
            <span className="text-base truncate">{file.name}</span>
          </div>
          <button
            type="button"
            onClick={clear}
            className="rounded-full bg-foreground/70 text-background p-1.5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
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
          className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg py-8 transition-colors ${
            isDragging
              ? "bg-foreground/5 text-foreground"
              : "bg-card text-muted-foreground"
          }`}
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25'><rect width='100%25' height='100%25' fill='none' rx='8' ry='8' stroke='${
              isDragging ? "%23000000" : "%23B8860B"
            }' stroke-opacity='${isDragging ? "0.6" : "0.55"}' stroke-width='4' stroke-dasharray='14 10'/></svg>")`,
          }}
        >
          <AudioLines className="h-5 w-5" />
          <span className="text-base">
            {isDragging ? "Drop audio to upload" : "Add an audio file or drag & drop"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}
      <p
        className="mt-2 text-xs text-center"
        style={{
          color: "#5B4A3F",
          opacity: 0.6,
          fontFamily: "'Source Sans 3', sans-serif",
          fontStyle: "italic",
        }}
      >
        Record directly — coming soon
      </p>
    </div>
  );
};

export default AudioUpload;
