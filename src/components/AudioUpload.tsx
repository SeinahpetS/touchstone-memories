import { useEffect, useRef, useState } from "react";
import { AudioLines, Mic, Square, Upload, X } from "lucide-react";
import { useEntitlement } from "@/hooks/useEntitlement";
import { VividUpgradeCard } from "@/components/VividUpgradeCard";
import { Button } from "@/components/ui/button";

interface Props {
  file: File | null;
  onSelect: (file: File | null) => void;
}

const FREE_MAX_SECONDS = 10;

async function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = document.createElement("audio");
      audio.preload = "metadata";
      audio.src = url;
      const cleanup = () => URL.revokeObjectURL(url);
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        cleanup();
        resolve(Number.isFinite(d) ? d : 0);
      };
      audio.onerror = () => {
        cleanup();
        resolve(0);
      };
    } catch {
      resolve(0);
    }
  });
}

const AudioUpload = ({ file, onSelect }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [vividOpen, setVividOpen] = useState(false);
  const entitlement = useEntitlement();
  const [recordingState, setRecordingState] = useState<"idle" | "requesting" | "recording" | "stopping">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const limitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const releaseMicrophone = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (limitRef.current) clearTimeout(limitRef.current);
    timerRef.current = null;
    limitRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const recorder = recorderRef.current;
      if (recorder) {
        recorder.ondataavailable = null;
        recorder.onstop = null;
        recorder.onerror = null;
        if (recorder.state !== "inactive") recorder.stop();
      }
      releaseMicrophone();
    };
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    setRecordingState("stopping");
    recorder.stop();
    releaseMicrophone();
  };

  const startRecording = async () => {
    if (recordingState !== "idle") return;
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Recording isn’t supported in this browser. You can still upload an audio file.");
      return;
    }
    setRecordingState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg;codecs=opus"]
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        releaseMicrophone();
        recorderRef.current = null;
        if (!mountedRef.current) return;
        setRecordingState("idle");
        const type = recorder.mimeType || chunks[0]?.type || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (!blob.size) {
          setError("No audio was captured. Please try recording again.");
          return;
        }
        const extension = type.includes("mp4") ? "m4a" : type.includes("ogg") ? "ogg" : "webm";
        // Free recordings stop at the existing limit; no duration probe is needed.
        onSelect(new File([blob], `Recording-${Date.now()}.${extension}`, { type }));
      };
      recorder.onerror = () => {
        recorder.onstop = null;
        recorder.ondataavailable = null;
        if (recorder.state !== "inactive") recorder.stop();
        releaseMicrophone();
        recorderRef.current = null;
        if (mountedRef.current) {
          setRecordingState("idle");
          setError("The recording was interrupted. Please try again.");
        }
      };
      recorder.start();
      setSeconds(0);
      setRecordingState("recording");
      const startedAt = Date.now();
      timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startedAt) / 1000)), 250);
      if (!entitlement.hasAccess) limitRef.current = setTimeout(stopRecording, FREE_MAX_SECONDS * 1000);
    } catch (cause) {
      releaseMicrophone();
      recorderRef.current = null;
      if (!mountedRef.current) return;
      setRecordingState("idle");
      const name = cause && typeof cause === "object" && "name" in cause ? cause.name : "";
      setError(name === "NotAllowedError" || name === "SecurityError"
        ? "Microphone access was denied. Allow microphone access in your browser to record, or upload an audio file."
        : name === "NotFoundError"
          ? "No microphone was found. Connect one or upload an audio file."
          : "Couldn’t start recording. Check your microphone and try again, or upload an audio file.");
    }
  };

  const acceptFile = async (f: File | null) => {
    if (!f) {
      onSelect(null);
      return;
    }
    if (!entitlement.hasAccess) {
      const duration = await probeDuration(f);
      if (duration > FREE_MAX_SECONDS) {
        setVividOpen(true);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    onSelect(f);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    void acceptFile(f);
  };

  const clear = () => {
    onSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("audio/")) void acceptFile(f);
  };

  return (
    <div>
      {recordingState !== "idle" ? (
        <div className="flex w-full flex-col items-center gap-3 rounded-lg bg-card px-4 py-6 text-foreground" aria-live="polite">
          <div className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            <span className="tabular-nums">
              {recordingState === "requesting" ? "Waiting for microphone…" : recordingState === "stopping" ? "Finishing recording…" : `Recording ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
            </span>
          </div>
          {recordingState === "recording" && (
            <Button type="button" variant="secondary" className="rounded-full" onClick={stopRecording}>
              <Square /> Stop recording
            </Button>
          )}
        </div>
      ) : file ? (
        <div className="relative flex w-full flex-col gap-3 rounded-lg bg-card px-4 py-6">
          <div className="flex min-w-0 items-center justify-between gap-2 text-foreground">
            <div className="flex min-w-0 items-center gap-2">
            <AudioLines className="h-5 w-5" />
            <span className="text-base truncate">{file.name}</span>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Remove audio"
              onClick={clear}
              className="h-8 w-8 shrink-0 rounded-full bg-foreground/70 text-background hover:bg-foreground/80 hover:text-background"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {previewUrl && <audio controls src={previewUrl} className="w-full" aria-label="Audio preview" />}
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
          className={`flex w-full flex-col items-center justify-center gap-3 rounded-lg py-6 transition-colors ${
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
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              type="button"
              variant="ghost"
              disabled={entitlement.loading}
              onClick={() => void startRecording()}
              className="flex items-center gap-2 rounded-full bg-foreground/5 hover:bg-foreground/10 px-4 py-2 text-foreground transition-colors"
            >
              <Mic className="h-5 w-5" />
              <span className="text-base">Record audio</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-2 rounded-full bg-foreground/5 hover:bg-foreground/10 px-4 py-2 text-foreground transition-colors"
            >
              <Upload className="h-5 w-5" />
              <span className="text-base">Upload</span>
            </Button>
          </div>
          <span className="text-xs opacity-70">
            or drag &amp; drop an audio file
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
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}

      <VividUpgradeCard
        open={vividOpen}
        triggeredBy="audio_length"
        onDismiss={() => setVividOpen(false)}
      />
    </div>
  );
};

export default AudioUpload;
