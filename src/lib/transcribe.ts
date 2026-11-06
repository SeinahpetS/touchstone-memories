/**
 * Transcription service.
 *
 * All speech-to-text goes through this module so the engine can be swapped
 * later (e.g. for native Apple transcription) without touching any screen.
 * A screen asks for a session, gets live transcript updates, and stops it.
 */

export type TranscribeError = "denied" | "unsupported" | "unavailable" | "error";

export interface TranscribeUpdate {
  /** Everything heard so far: finished speech plus the words still in flight. */
  transcript: string;
  /** The words currently being recognised, not yet finalised. */
  interim: string;
  /** Each finalised phrase, in order. */
  finals: string[];
}

export interface TranscribeHandlers {
  onUpdate: (update: TranscribeUpdate) => void;
  onError: (error: TranscribeError) => void;
}

export interface TranscribeSession {
  /** Ends transcription for good. Nothing restarts after this. */
  stop: () => void;
  /** Halves listening without losing what was already heard. */
  pause: () => void;
  /** Picks listening back up after a pause. */
  resume: () => void;
  isPaused: () => boolean;
}

export interface TranscribeEngine {
  /** False when this browser cannot transcribe speech at all. */
  isSupported: () => boolean;
  /**
   * Starts listening right away. Must be called from inside a tap handler so
   * the browser is allowed to ask for microphone permission.
   * Returns null when the engine cannot run.
   */
  start: (handlers: TranscribeHandlers) => TranscribeSession | null;
}

interface RecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}

interface RecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResultLike };
}

interface RecognitionErrorEventLike {
  error: string;
}

interface RecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: ((event: RecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Browser speech recognition (Web Speech API).
 *
 * Keeps running through silence of any length: the browser sometimes ends a
 * recognition run by itself, and this engine quietly starts another one so the
 * speaker never has to do anything. Only `stop()` ends it for real.
 */
const webSpeechEngine: TranscribeEngine = {
  isSupported: () => recognitionCtor() !== null,

  start: (handlers) => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      handlers.onError("unsupported");
      return null;
    }

    let finished: string[] = [];
    let interim = "";
    let stopped = false;
    let paused = false;
    let restarting = false;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let startedAt = 0;
    let quickFails = 0;

    const emit = () => {
      const spoken = finished.join(" ").replace(/\s+/g, " ").trim();
      const trailing = interim.trim();
      handlers.onUpdate({
        transcript: trailing ? `${spoken} ${trailing}`.trim() : spoken,
        interim,
        finals: [...finished],
      });
    };

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";
    recognition.maxAlternatives = 1;

    const begin = (delay = 0) => {
      if (stopped || paused || restarting) return;
      restarting = true;
      if (restartTimer) clearTimeout(restartTimer);
      restartTimer = setTimeout(() => {
        restartTimer = null;
        restarting = false;
        if (stopped || paused) return;
        startedAt = Date.now();
        try {
          recognition.start();
        } catch {
          // Already running: the existing run keeps feeding results.
        }
      }, delay);
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const said = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finished.push(said);
          interim = "";
        } else {
          interim = said;
        }
      }
      emit();
    };

    recognition.onerror = (event) => {
      if (stopped) return;
      if (
        event.error === "network" ||
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        stopped = true;
        if (restartTimer) clearTimeout(restartTimer);
        try {
          recognition.abort();
        } catch {
          /* already finished */
        }
        handlers.onError("unavailable");
        return;
      }
      if (event.error === "aborted") return;
      // Anything else (silence timeouts, network hiccups) is recoverable:
      // the run is ending, so quietly begin another one.
    };

    recognition.onend = () => {
      if (stopped || paused) return;
      // The browser ended this run on its own. Carry on without telling anyone.
      // A run that dies the moment it begins means something is wrong (no
      // network, no service): back off instead of spinning, and stop trying
      // once it's clear it will never come back. What was heard is kept.
      if (Date.now() - startedAt < 700) quickFails += 1;
      else quickFails = 0;
      if (quickFails > 8) return;
      begin(250);
    };

    begin();

    return {
      stop: () => {
        stopped = true;
        if (restartTimer) clearTimeout(restartTimer);
        try {
          recognition.stop();
        } catch {
          /* already finished */
        }
      },
      pause: () => {
        if (paused || stopped) return;
        paused = true;
        try {
          recognition.stop();
        } catch {
          /* already finished */
        }
      },
      resume: () => {
        if (stopped) return;
        paused = false;
        begin();
      },
      isPaused: () => paused,
    };
  },
};

/** The engine every screen uses. Swap this line to change transcription. */
export const transcribeEngine: TranscribeEngine = webSpeechEngine;

/**
 * Live microphone volume (0..1) for voice-reactive visuals.
 * Returns null when the browser can't open a second mic stream.
 */
export async function startVoiceLevel(
  onLevel: (level: number) => void,
): Promise<{ stop: () => void } | null> {
  try {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new Ctx();
    if (ctx.state === "suspended") await ctx.resume().catch(() => {});
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      onLevel(Math.min(1, rms * 6));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return {
      stop: () => {
        stopped = true;
        cancelAnimationFrame(raf);
        stream.getTracks().forEach((t) => t.stop());
        void ctx.close().catch(() => {});
      },
    };
  } catch {
    return null;
  }
}
