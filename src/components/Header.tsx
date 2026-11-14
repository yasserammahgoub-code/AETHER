import { Icon } from "./ui/Icon";
import type { HealthStatus } from "../types";

function AetherLogo() {
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="orbit" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <ellipse
          cx="32"
          cy="32"
          rx="29"
          ry="11"
          transform="rotate(-38 32 32)"
          fill="none"
          stroke="url(#orbit)"
          strokeWidth="2.4"
        />
        <path d="M32 14 L44 50 H37.5 L35.2 42.5 H28.8 L26.5 50 H20 L32 14z M30.3 37.2 H33.7 L32 31 z" fill="#e8f0ff" />
        <circle cx="52" cy="14" r="3" fill="#38bdf8" />
      </svg>
      <div className="leading-none">
        <div className="text-[2rem] font-extrabold italic tracking-wide text-ink">AETHER</div>
        <div className="mt-1 text-[11px] font-medium text-mute">Astronaut Health Companion</div>
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<HealthStatus, { label: string; text: string; ring: string; bg: string; note: string }> = {
  green: {
    label: "GREEN",
    text: "text-neon-green",
    ring: "border-neon-green/60 shadow-[0_0_26px_rgba(34,224,122,0.28)]",
    bg: "from-emerald-900/50 to-emerald-950/40",
    note: "No concerning deviations detected.",
  },
  amber: {
    label: "YELLOW",
    text: "text-neon-amber",
    ring: "border-neon-amber/60 shadow-[0_0_26px_rgba(250,204,21,0.25)]",
    bg: "from-amber-900/45 to-amber-950/40",
    note: "A reading is outside its acceptable range.",
  },
  red: {
    label: "RED",
    text: "text-neon-red",
    ring: "border-neon-red/60 shadow-[0_0_26px_rgba(255,59,59,0.3)]",
    bg: "from-red-900/50 to-red-950/40",
    note: "Multiple readings need attention.",
  },
};

interface Props {
  status: HealthStatus;
  alerts: number;
  lastAssessment: string;
  /** Optional override for the status sub-line (e.g. what the Parameter Checker flagged). */
  note?: string;
  /** An emergency session is running (the screen may be closed). */
  emergencyActive?: boolean;
  onEmergency: () => void;
  /** Slim header (logo, Overall Health, Emergency Mode) used by the Parameter Checker page. */
  compact?: boolean;
}

export function Header({ status, alerts, lastAssessment, note, emergencyActive = false, onEmergency, compact = false }: Props) {
  const s = STATUS_STYLE[status];
  if (compact) {
    const detail = note ?? (status === "green" ? null : s.note);
    return (
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <AetherLogo />
        <div className={`flex items-center gap-3 rounded-2xl border bg-gradient-to-r px-5 py-2.5 ${s.ring} ${s.bg}`} role="status" aria-live="polite">
          <span
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
              status === "green" ? "bg-neon-green" : status === "amber" ? "bg-neon-amber" : "bg-neon-red"
            } text-space-950`}
          >
            <Icon name={status === "green" ? "check" : "alert"} className="h-5 w-5" strokeWidth={3} />
          </span>
          <div className="min-w-0">
            <div className="text-xl font-semibold">
              Overall Health: <span className={`font-bold ${s.text}`}>{s.label}</span>
            </div>
            {detail && <div className="max-w-[44ch] text-xs text-ink/85">{detail}</div>}
          </div>
        </div>
        <button
          type="button"
          onClick={onEmergency}
          className={`ml-auto flex items-center justify-center gap-3 rounded-2xl border border-red-300/40 bg-gradient-to-b from-red-500 to-red-700 px-7 py-3 text-lg font-bold text-white shadow-[0_0_28px_rgba(255,40,40,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${emergencyActive ? "emg-pulse" : ""}`}
        >
          <Icon name="alert" className="h-7 w-7" filled strokeWidth={1.4} />
          <span className="text-left leading-tight">
            Emergency Mode
            {emergencyActive && <span className="block text-xs font-semibold">In progress. Tap to return.</span>}
          </span>
        </button>
      </header>
    );
  }
  return (
    <header className="grid items-center gap-3 md:grid-cols-2 xl:grid-cols-[250px_minmax(0,1fr)_minmax(0,1.15fr)_auto]">
      <div className="md:col-span-2 xl:col-span-1">
        <AetherLogo />
      </div>

      <div
        className={`flex items-center gap-4 rounded-2xl border bg-gradient-to-r px-5 py-3.5 ${s.ring} ${s.bg}`}
        role="status"
        aria-live="polite"
      >
        <span
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${
            status === "green" ? "bg-neon-green" : status === "amber" ? "bg-neon-amber" : "bg-neon-red"
          } text-space-950 shadow-[0_0_18px_currentColor]`}
        >
          <Icon name={status === "green" ? "check" : "alert"} className="h-7 w-7" strokeWidth={3} />
        </span>
        <div className="min-w-0">
          <div className="text-xl font-bold">
            Overall Health: <span className={s.text}>{s.label}</span>
          </div>
          <div className="text-sm text-ink/85">{note ?? (status === "green" ? "No concerning deviations detected." : s.note)}</div>
        </div>
      </div>

      <div className="panel flex items-center justify-between gap-4 rounded-2xl px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Icon name="clock" className="h-9 w-9 shrink-0 text-ink/90" strokeWidth={1.5} />
          <div>
            <div className="text-sm font-medium text-ink/90">Last Assessment</div>
            <div className="whitespace-nowrap text-sm text-ink">{lastAssessment}</div>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-line/60 sm:block" />
        <div className="flex items-center gap-2.5">
          <Icon name="bell" className="h-8 w-8 text-neon-amber" filled strokeWidth={1.2} />
          <div className="text-base font-bold text-neon-amber">
            {alerts} <span className="font-semibold">Alert{alerts === 1 ? "" : "s"}</span>
          </div>
        </div>
        <div className="hidden h-10 w-px bg-line/60 sm:block" />
        <div className="hidden items-center gap-3 sm:flex">
          <Icon name="calendar" className="h-8 w-8 text-neon-blue" strokeWidth={1.5} />
          <div>
            <div className="text-sm font-medium text-ink/90">Next Check</div>
            <div className="text-sm text-ink">in 6h</div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onEmergency}
        className={`flex items-center justify-center gap-3 rounded-2xl border border-red-300/40 bg-gradient-to-b from-red-500 to-red-700 px-7 py-4 text-lg font-bold text-white shadow-[0_0_28px_rgba(255,40,40,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:col-span-2 xl:col-span-1 ${emergencyActive ? "emg-pulse" : ""}`}
      >
        <Icon name="alert" className="h-8 w-8" filled strokeWidth={1.4} />
        <span className="text-left leading-tight">
          Emergency Mode
          {emergencyActive && <span className="block text-xs font-semibold">In progress. Tap to return.</span>}
        </span>
      </button>
    </header>
  );
}
