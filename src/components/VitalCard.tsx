import type { ReactNode } from "react";
import { Sparkline } from "./ui/Sparkline";

interface Props {
  label: string;
  value: string;
  unit: string;
  icon: ReactNode;
  history: number[];
  active: boolean;
  onHover: (on: boolean) => void;
}

export function VitalCard({ label, value, unit, icon, history, active, onHover }: Props) {
  return (
    <div className="@container/vital h-full">
      <div
        tabIndex={0}
        onMouseEnter={() => onHover(true)}
        onMouseLeave={() => onHover(false)}
        onFocus={() => onHover(true)}
        onBlur={() => onHover(false)}
        className={`flex h-full items-center gap-2.5 rounded-xl border px-3 transition focus:outline-none ${
          active
            ? "border-neon-cyan/80 bg-space-700/70 shadow-[0_0_20px_rgba(34,211,238,0.35)]"
            : "border-blue-500/35 bg-space-800/70 shadow-[inset_0_0_18px_rgba(40,110,255,0.12)]"
        }`}
      >
        <div className="grid h-11 w-11 shrink-0 place-items-center">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-neon-blue">{label}</div>
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="text-2xl font-bold leading-tight text-ink">{value}</span>
            <span className="text-xs font-medium text-ink/85">{unit}</span>
          </div>
        </div>
        <Sparkline data={history} className="hidden h-9 w-16 shrink-0 @[270px]/vital:block" />
      </div>
    </div>
  );
}
