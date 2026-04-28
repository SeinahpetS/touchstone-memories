// Soft confirmation feedback: a single gentle chime + light haptic pulse.
// Fires when a Touchstone is successfully saved.

let audioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
};

const playChime = () => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // Soft, warm sine — single tone around C6 (~1046 Hz).
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, now);

    // Gentle envelope: quick rise, slow decay. Quiet peak.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
  } catch {
    // Audio is non-critical; swallow errors.
  }
};

const triggerHaptic = () => {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(15); // single light pulse
    }
  } catch {
    // Haptics are non-critical.
  }
};

export const playSaveFeedback = () => {
  playChime();
  triggerHaptic();
};
