import type { ReactNode } from "react";
import { Icon, type IconName } from "./ui/Icon";

interface Stat {
  icon: IconName;
  iconClass: string;
  label: string;
  value: string;
  unit: string;
  note?: string;
}

const STATS: Stat[] = [
  { icon: "shield", iconClass: "text-sky-300", label: "Radiation Dose", value: "0.12", unit: "mSv", note: "(+0.02)" },
  { icon: "thermo", iconClass: "text-sky-300", label: "Cabin Temp", value: "21", unit: "°C" },
  { icon: "cloud", iconClass: "text-sky-300", label: "CO₂ Level", value: "720", unit: "ppm" },
  { icon: "drop", iconClass: "text-sky-300", label: "Humidity", value: "45", unit: "%" },
];

function EnvCard({ s }: { s: Stat }): ReactNode {
  return (
    <div className="panel-soft flex items-center gap-3 px-4 py-3 shadow-[inset_0_0_18px_rgba(40,110,255,0.12)]">
      <Icon name={s.icon} filled={s.icon === "shield"} className={`h-9 w-9 shrink-0 ${s.iconClass}`} strokeWidth={1.4} />
      <div className="min-w-0 leading-tight">
        <div className="truncate text-sm font-medium text-ink/90">{s.label}</div>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span className="text-xl font-bold text-ink">{s.value}</span>
          <span className="text-base font-bold text-ink">{s.unit}</span>
        </div>
        {s.note && <div className="text-[11px] font-semibold text-neon-amber">{s.note}</div>}
      </div>
    </div>
  );
}

export function EnvironmentStrip({ missionDay = 142 }: { missionDay?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.9fr)]">
      {STATS.map((s) => (
        <EnvCard key={s.label} s={s} />
      ))}
      <div className="relative col-span-full flex items-center overflow-hidden rounded-xl border-t border-blue-500/30 sm:col-span-2 lg:col-span-1">
        <div className="ecg min-w-0 flex-1" role="img" aria-label="Live ECG waveform" />
        <div className="shrink-0 whitespace-nowrap pl-2 pr-3 text-sm font-medium text-ink">Mission Day {missionDay} • ISS</div>
      </div>
    </div>
  );
}
