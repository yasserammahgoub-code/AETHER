import { useCallback, useEffect, useRef, useState } from "react";
import { matchesActivationPhrase } from "../lib/emergency/voice";

export type VoiceStatus = "unsupported" | "idle" | "requesting" | "listening" | "denied" | "error";

/* Minimal typing for the Web Speech API, which is not in lib.dom for every TypeScript version. */
interface SpeechResultList {
  length: number;
  [i: number]: { isFinal: boolean; 0: { transcript: string } };
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onresult: ((e: { resultIndex: number; results: SpeechResultList }) => void) | null;
  start: () => void;
  abort: () => void;
}
type RecognitionCtor = new () => Recognition;

function getCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface Options {
  /** Listen only while true (the standby screen). */
  enabled: boolean;
  onMatch: () => void;
}

/**
 * Listens for the activation phrase while `enabled`. Reports the microphone state, the last words heard and a
 * 0..1 input level (from a separate analyser on the same microphone) for the waveform.
 */
export function useVoiceActivation({ enabled, onMatch }: Options) {
  const [status, setStatus] = useState<VoiceStatus>(() => (typeof window !== "undefined" && getCtor() ? "idle" : "unsupported"));
  const [transcript, setTranscript] = useState("");
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const onMatchRef = useRef(onMatch);
  onMatchRef.current = onMatch;

  useEffect(() => {
    const Ctor = getCtor();
    if (!enabled) return;
    if (!Ctor) {
      setStatus("unsupported");
      return;
    }

    let stopped = false;
    let fatal = false;
    let restart: number | undefined;
    let raf = 0;
    let stream: MediaStream | null = null;
    let audio: AudioContext | null = null;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    setStatus("requesting");
    setMessage("");
    setTranscript("");

    const startMeter = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        audio = new AudioContext();
        const an = audio.createAnalyser();
        an.fftSize = 256;
        audio.createMediaStreamSource(stream).connect(an);
        const buf = new Uint8Array(an.frequencyBinCount);
        let last = 0;
        const tick = (t = 0) => {
          if (t - last > 90) {
            last = t;
            an.getByteFrequencyData(buf);
            let sum = 0;
            for (const v of buf) sum += v;
            setLevel(Math.round(Math.min(1, sum / buf.length / 90) * 20) / 20);
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        /* The meter is cosmetic: recognition still works and the waveform falls back to its idle animation. */
      }
    };

    rec.onstart = () => {
      setStatus("listening");
      if (!stream) void startMeter();
    };
    rec.onresult = (e) => {
      let heard = "";
      for (let i = e.resultIndex; i < e.results.length; i++) heard += e.results[i][0].transcript + " ";
      heard = heard.trim();
      if (heard) setTranscript(heard);
      if (matchesActivationPhrase(heard)) {
        stopped = true;
        rec.abort();
        onMatchRef.current();
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        fatal = true;
        setStatus("denied");
        setMessage("Microphone access was blocked. Allow it in the browser's site settings, then try again.");
      } else if (e.error === "audio-capture") {
        fatal = true;
        setStatus("error");
        setMessage("No microphone was found.");
      } else if (e.error === "network") {
        fatal = true;
        setStatus("error");
        setMessage("Speech recognition needs a network connection in this browser and could not reach its service.");
      }
      /* "no-speech" and "aborted" are routine: onend restarts listening. */
    };
    rec.onend = () => {
      if (stopped || fatal) return;
      restart = window.setTimeout(() => {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }, 250);
    };

    try {
      rec.start();
    } catch {
      setStatus("error");
      setMessage("Voice listening could not start.");
    }

    return () => {
      stopped = true;
      window.clearTimeout(restart);
      cancelAnimationFrame(raf);
      rec.onend = rec.onerror = rec.onresult = rec.onstart = null;
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      stream?.getTracks().forEach((t) => t.stop());
      void audio?.close().catch(() => undefined);
      setLevel(0);
    };
  }, [enabled, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { status, transcript, message, level, retry };
}
