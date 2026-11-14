import type { ReactNode } from "react";
import { Icon, type IconName } from "../ui/Icon";

/** Marks a single item as simulated. Dashed cyan is used for simulation and nothing else in Emergency Mode. */
export function SimBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border border-dashed border-neon-cyan/80 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-neon-cyan ${className}`}
    >
      SIMULATED
    </span>
  );
}

/** Always visible at the top of Emergency Mode: states, in plain words, that nothing here reaches real people. */
export function SimBanner() {
  return (
    <div className="sim-box flex items-start gap-3 px-4 py-2.5" role="note">
      <Icon name="radio" className="mt-0.5 h-6 w-6 shrink-0 text-neon-cyan" />
      <p className="text-[13px] leading-snug text-cyan-50">
        <strong className="font-semibold text-neon-cyan">Prototype simulation.</strong> Crew and Flight Surgeon messages on this
        screen are simulated. No alert, call or message leaves this device and nobody is contacted. In a real emergency, use your
        actual communication systems.
      </p>
    </div>
  );
}

/** The standing safety statement. */
export function SafetyNote() {
  return (
    <div className="emg-panel flex items-start gap-3 px-4 py-2.5" role="note">
      <Icon name="shield" className="mt-0.5 h-6 w-6 shrink-0 text-neon-red" />
      <p className="text-[13px] leading-snug text-emg-ink/90">
        AETHER does not diagnose conditions and does not recommend or prescribe medication. It records what you report, shows
        checklist steps, and helps you reach your crew and the Flight Surgeon. Follow their directions.
      </p>
    </div>
  );
}

interface PanelProps {
  title: string;
  icon: IconName;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
  /** red: emergency burgundy (default). blue: navy data-entry panel. hot: the response checklist. */
  tone?: "red" | "blue" | "hot";
}

const TONE = { red: "", blue: "emg-panel-blue", hot: "emg-panel-hot" } as const;

export function EmPanel({ title, icon, right, children, className = "", id, tone = "red" }: PanelProps) {
  return (
    <section id={id} className={`emg-panel ${TONE[tone]} p-4 sm:p-5 ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="flex min-w-0 items-center gap-2.5 text-lg font-semibold text-emg-ink">
          <Icon name={icon} className={`h-6 w-6 shrink-0 ${tone === "blue" ? "text-neon-cyan" : "text-neon-red"}`} />
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

export const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

/** AETHER mark, same artwork as the dashboard header. */
export function AetherLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-10 w-10 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="emg-orbit" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <ellipse cx="32" cy="32" rx="29" ry="11" transform="rotate(-38 32 32)" fill="none" stroke="url(#emg-orbit)" strokeWidth="2.4" />
        <path d="M32 14 L44 50 H37.5 L35.2 42.5 H28.8 L26.5 50 H20 L32 14z M30.3 37.2 H33.7 L32 31 z" fill="#e8f0ff" />
        <circle cx="52" cy="14" r="3" fill="#38bdf8" />
      </svg>
      <div className="leading-none">
        <div className="text-2xl font-extrabold italic tracking-wide text-white">AETHER</div>
        <div className="mt-0.5 text-[10px] font-medium text-blue-200/80">Astronaut Health Companion</div>
      </div>
    </div>
  );
}

export function MethodBadge({ method }: { method: "voice" | "manual" | null }) {
  if (!method) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold tracking-wide ${
        method === "voice" ? "border-neon-cyan/70 bg-cyan-950/70 text-neon-cyan" : "border-neon-amber/70 bg-amber-950/60 text-neon-amber"
      }`}
    >
      <Icon name={method === "voice" ? "mic" : "alert"} className="h-3.5 w-3.5" />
      {method === "voice" ? "VOICE" : "MANUAL"}
    </span>
  );
}
