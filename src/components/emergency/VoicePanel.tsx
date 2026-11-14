import { useVoiceActivation, type VoiceStatus } from "../../hooks/useVoiceActivation";
import { utcTime } from "../../lib/emergency/engine";
import { ACTIVATION_PHRASE } from "../../lib/emergency/voice";
import type { ActivationMethod } from "../../lib/emergency/types";
import { Icon } from "../ui/Icon";
import { focusRing } from "./ui";

interface Props {
  active: boolean;
  method: ActivationMethod | null;
  startedAt: string | null;
  onActivate: (method: ActivationMethod) => void;
}

/** Bar heights (%) forming a symmetric envelope, tallest at the centre. */
const ENVELOPE = [18, 30, 22, 44, 36, 60, 48, 72, 58, 84, 66, 92, 74, 100, 80];
const DELAYS = [0, 0.3, 0.12, 0.5, 0.2, 0.62, 0.05, 0.4, 0.25, 0.7, 0.15, 0.55, 0.35, 0.08, 0.45];

function Waveform({ level, live, tone, mirror }: { level: number; live: boolean; tone: string; mirror?: boolean }) {
  const bars = mirror ? [...ENVELOPE].reverse() : ENVELOPE;
  return (
    <div className="flex h-20 min-w-0 flex-1 items-center justify-center gap-[5px]" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={`emg-bar ${live ? "emg-bar-live" : ""} ${tone}`}
          style={{
            height: `${live ? Math.max(14, h * (0.3 + level * 0.7)) : Math.max(8, h * 0.34)}%`,
            animationDelay: `${DELAYS[i]}s`,
            opacity: live ? 0.95 : 0.55,
          }}
        />
      ))}
    </div>
  );
}

const MIC_STATUS: Record<VoiceStatus, { label: string; dot: string; text: string }> = {
  listening: { label: "LISTENING", dot: "bg-neon-green", text: "text-neon-green" },
  requesting: { label: "STARTING MICROPHONE", dot: "bg-neon-amber", text: "text-neon-amber" },
  idle: { label: "MICROPHONE OFF", dot: "bg-neon-amber", text: "text-neon-amber" },
  denied: { label: "MICROPHONE BLOCKED", dot: "bg-neon-amber", text: "text-neon-amber" },
  error: { label: "VOICE UNAVAILABLE", dot: "bg-neon-amber", text: "text-neon-amber" },
  unsupported: { label: "VOICE NOT SUPPORTED", dot: "bg-neon-amber", text: "text-neon-amber" },
};

/** Screen 1 hero: voice activation (listening / activated / unavailable) with a manual alternative. */
export function VoicePanel({ active, method, startedAt, onActivate }: Props) {
  const voice = useVoiceActivation({ enabled: !active, onMatch: () => onActivate("voice") });
  const listening = !active && voice.status === "listening";
  const unavailable = !active && !listening && voice.status !== "requesting";
  const st = MIC_STATUS[voice.status];

  const hero = active ? "emg-hero emg-hero-ok" : unavailable ? "emg-hero emg-hero-off" : "emg-hero";
  const barTone = active ? "bg-neon-green" : unavailable ? "bg-neon-amber" : "bg-neon-red";

  return (
    <section className={`${hero} p-4 sm:p-6`} aria-labelledby="emg-voice-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon name="alert" className={`h-9 w-9 shrink-0 ${active ? "text-neon-green" : "text-neon-red"}`} filled strokeWidth={1.4} />
          <div>
            <h2 id="emg-voice-title" className="text-xl font-extrabold tracking-wide text-white sm:text-2xl">
              {active ? "EMERGENCY ACTIVATED" : "EMERGENCY MODE"}
            </h2>
            <p className="text-sm text-white/80">
              {active
                ? `${method === "voice" ? "Activated by voice command" : "Activated manually"} at ${startedAt ? utcTime(startedAt) : "n/a"}`
                : "Voice-activated emergency assistance"}
            </p>
          </div>
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1.5 text-sm font-bold tracking-wide ${
            active ? "text-neon-green" : st.text
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${active ? "bg-neon-green" : st.dot} ${listening ? "emg-pulse" : ""}`} />
          {active ? `ACTIVE · ${method === "voice" ? "VOICE" : "MANUAL"}` : st.label}
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 sm:gap-4">
        <Waveform level={voice.level} live={listening} tone={barTone} />
        <div
          className={`relative grid h-20 w-20 shrink-0 place-items-center rounded-full border-2 sm:h-24 sm:w-24 ${
            active
              ? "border-neon-green bg-emerald-950/70 text-neon-green"
              : unavailable
                ? "border-neon-amber/80 bg-amber-950/50 text-neon-amber"
                : "border-neon-red bg-red-950/70 text-white shadow-[0_0_34px_rgba(255,59,59,0.7)]"
          } ${listening ? "emg-pulse" : ""}`}
        >
          <Icon name="mic" className="h-10 w-10 sm:h-12 sm:w-12" strokeWidth={1.7} />
          {unavailable && <span className="absolute h-[3px] w-20 rotate-45 rounded bg-neon-amber" aria-hidden="true" />}
        </div>
        <Waveform level={voice.level} live={listening} tone={barTone} mirror />
      </div>

      <p className="mt-3 text-center text-lg text-white sm:text-xl">
        Say: <strong className="font-bold text-neon-red [text-shadow:0_0_12px_rgba(255,59,59,0.7)]">“{ACTIVATION_PHRASE}”</strong>
      </p>

      {!active && <p className="mt-1 text-center text-xs text-white/65">Saying the word “emergency” anywhere in a sentence also activates it.</p>}

      <div className="mx-auto mt-3 max-w-2xl rounded-xl border border-white/20 bg-black/35 px-4 py-2.5 text-sm" aria-live="polite">
        <span className="text-white/60">Recognized speech: </span>
        {active ? (
          <span className="text-white/90">{method === "voice" ? "Activation phrase recognized." : "Not used. Emergency Mode was started manually."}</span>
        ) : voice.transcript ? (
          <span className="font-medium text-white">“{voice.transcript}”</span>
        ) : (
          <span className="text-white/60">{listening ? "Waiting for the activation phrase…" : "Nothing heard yet."}</span>
        )}
      </div>

      {!active && voice.status === "unsupported" && (
        <p role="alert" className="mx-auto mt-3 max-w-2xl text-center text-sm text-amber-100">
          This browser does not support voice recognition. Use the manual button below; it does the same thing.
        </p>
      )}
      {!active && (voice.status === "denied" || voice.status === "error") && (
        <div role="alert" className="mx-auto mt-3 flex max-w-2xl flex-wrap items-center justify-center gap-3 text-center text-sm text-amber-100">
          <span>{voice.message}</span>
          <button type="button" onClick={voice.retry} className={`rounded-lg border border-amber-200/60 px-3 py-1.5 font-semibold hover:bg-white/10 ${focusRing}`}>
            Try microphone again
          </button>
        </div>
      )}

      {!active && (
        <div className="mx-auto mt-4 max-w-2xl">
          <button
            type="button"
            onClick={() => onActivate("manual")}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl border border-red-200/60 bg-gradient-to-b from-red-500 to-red-700 px-6 py-4 text-lg font-extrabold tracking-wide text-white shadow-[0_0_28px_rgba(255,40,40,0.6)] hover:brightness-110 ${focusRing}`}
          >
            <Icon name="alert" className="h-6 w-6" filled strokeWidth={1.4} />
            ACTIVATE EMERGENCY MANUALLY
          </button>
        </div>
      )}
    </section>
  );
}
