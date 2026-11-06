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

  // Hold any query-string share (url/title/text) before anything else.
  if (!stored.current) {
    const url = params.get("url"), title = params.get("title"), text = params.get("text");
    stored.current = url || title || text
      ? saveSharedPayload({ url, title, text }).catch(() => {})
      : Promise.resolve();
  }

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    void (async () => {
      await stored.current;
      if (cancelled) return;
      const payload = await readSharedPayload();
      if (!user) {
        if (payload) markPendingShare();
        navigate("/auth", { replace: true });
        return;
      }
      const next = buildSharedPrefill(payload);
      await clearSharedPayload();
      if (!cancelled) {
        if (params.toString()) navigate("/capture", { replace: true });
        setPrefill(next);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  const done = () => navigate("/archive", { replace: true });

  return (
    <main className="min-h-screen bg-background">
      {prefill && <QuickCaptureSheet open onClose={done} onSaved={done} prefill={prefill} />}
    </main>
  );
}
