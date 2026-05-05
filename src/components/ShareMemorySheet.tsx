import { useState } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  senderName: string;
  memoryTitle?: string | null;
  memoryNote?: string | null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s\-]{7,}$/;

type Kind = "email" | "phone" | "invalid";

const classify = (raw: string): Kind => {
  const v = raw.trim();
  if (!v) return "invalid";
  if (v.includes("@")) return EMAIL_RE.test(v) ? "email" : "invalid";
  return PHONE_RE.test(v) ? "phone" : "invalid";
};

const ShareMemorySheet = ({ open, onOpenChange, senderName, memoryTitle, memoryNote }: Props) => {
  const [recipients, setRecipients] = useState("");
  const [allowAdd, setAllowAdd] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setRecipients("");
    setAllowAdd(false);
    setError(null);
  };

  const handleSend = () => {
    const entries = recipients.split(",").map((s) => s.trim()).filter(Boolean);
    if (entries.length === 0) {
      setError("Please enter a valid email or phone number");
      return;
    }
    const kinds = entries.map((e) => ({ value: e, kind: classify(e) }));
    if (kinds.some((k) => k.kind === "invalid")) {
      setError("Please enter a valid email or phone number");
      return;
    }
    setError(null);

    const title = memoryTitle || "a memory";
    const noteRaw = (memoryNote || "").trim();
    const note = noteRaw.length > 200 ? noteRaw.slice(0, 200) + "…" : noteRaw;

    const baseLines = [
      `${senderName} shared a memory with you on Touchstone.`,
      "",
      `"${title}"`,
      "",
      note,
    ];

    const emailExtra = [
      "",
      "[ARTIFACT_CARD_IMAGE_PLACEHOLDER — a hosted image of the memory card will appear here in a future update]",
      "",
      "See the full memory: [PUBLIC_ARTIFACT_URL_PLACEHOLDER]",
    ];

    const smsExtra = ["", "See the full memory: [PUBLIC_ARTIFACT_URL_PLACEHOLDER]"];

    const inviteLine = allowAdd
      ? [
          "",
          `${senderName} is also inviting you to save this memory to your own Touchstone constellation: [ADD_TO_CONSTELLATION_URL_PLACEHOLDER]`,
        ]
      : [];

    const emailBody = [...baseLines, ...emailExtra, ...inviteLine].join("\n");
    const smsBody = [...baseLines, ...smsExtra, ...inviteLine].join("\n");
    const subject = "Check out my Touchstone memory";

    kinds.forEach(({ value, kind }) => {
      if (kind === "email") {
        const url = `mailto:${encodeURIComponent(value)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
        window.open(url, "_blank");
      } else if (kind === "phone") {
        const cleaned = value.replace(/[^\d+]/g, "");
        const url = `sms:${cleaned}?&body=${encodeURIComponent(smsBody)}`;
        window.open(url, "_blank");
      }
    });

    reset();
    onOpenChange(false);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <SheetContent
        side="bottom"
        className="border-0 p-0"
        style={{ background: "#F2EEE5", borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      >
        <div className="px-6 pt-6 pb-8 space-y-5">
          <h2
            className="text-center"
            style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, color: "#1E2E3E" }}
          >
            Share this memory
          </h2>

          <div className="space-y-1.5">
            <input
              type="text"
              value={recipients}
              onChange={(e) => {
                setRecipients(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Email or phone number"
              className="w-full rounded-lg border bg-white px-4 py-3 outline-none"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: "#1E2E3E", borderColor: "#D9D2C2" }}
            />
            <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: "#5B4A3F" }}>
              Separate multiple addresses with a comma.
            </p>
            {error && (
              <p style={{ fontFamily: "'Jost', sans-serif", fontSize: 12, color: "#C2714F" }}>
                {error}
              </p>
            )}
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox
              checked={allowAdd}
              onCheckedChange={(v) => setAllowAdd(v === true)}
              className="mt-0.5"
              style={
                allowAdd
                  ? ({ backgroundColor: "#B8860B", borderColor: "#B8860B", color: "#F2EEE5" } as any)
                  : ({ borderColor: "#1E2E3E" } as any)
              }
            />
            <span style={{ fontFamily: "'Jost', sans-serif", fontSize: 14, color: "#1E2E3E" }}>
              Allow recipient to add this memory to their own Touchstone constellation.
            </span>
          </label>

          <div className="space-y-2 pt-2">
            <button
              onClick={handleSend}
              className="w-full rounded-xl"
              style={{
                background: "#1E2E3E",
                color: "#F2EEE5",
                height: 48,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              Send
            </button>
            <button
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="w-full"
              style={{
                color: "#1E2E3E",
                height: 44,
                fontFamily: "'Jost', sans-serif",
                fontSize: 15,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ShareMemorySheet;
