import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import QuickCaptureSheet from "@/components/QuickCaptureSheet";
import {
  buildSharedPrefill, clearSharedPayload, markPendingShare, readSharedPayload,
  saveSharedPayload, type SharedPrefill,
} from "@/lib/sharedCapture";

/** "Share to Touchstone" entry: opens Add a Touchstone pre-filled from shared content. */
export default function Capture() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [prefill, setPrefill] = useState<SharedPrefill | null>(null);
  const stored = useRef<Promise<void> | null>(null);
  const resolved = useRef(false);

  // Hold any query-string share (url/title/text) before anything else.
  if (!stored.current) {
    const url = params.get("url"), title = params.get("title"), text = params.get("text");
    stored.current = url || title || text
      ? saveSharedPayload({ url, title, text }).catch(() => {})
      : Promise.resolve();
  }

  useEffect(() => {
    if (loading || resolved.current) return;
    resolved.current = true;
    const cancelled = false;
    void (async () => {
      await stored.current;
      const payload = await readSharedPayload();
      if (!user) {
        if (payload) markPendingShare();
        navigate("/auth", { replace: true });
        return;
      }
      const next = buildSharedPrefill(payload);
      // Kept until save or cancel so a reload doesn't lose it.
      if (cancelled) return;
      if (params.toString()) navigate("/capture", { replace: true });
      setPrefill(next);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const done = () => {
    void clearSharedPayload();
    navigate("/archive", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background">
      {prefill && <QuickCaptureSheet open onClose={done} onSaved={done} prefill={prefill} />}
    </main>
  );
}
