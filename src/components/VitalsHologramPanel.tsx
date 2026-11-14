import { useState, type ReactNode } from "react";
import { BODY_MARKERS, BODY_VIEW, BodyHologram } from "./BodyHologram";
import { VitalCard } from "./VitalCard";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";
import type { LiveState } from "../hooks/useLiveVitals";
import type { VitalKey } from "../types";

export function VitalsHologramPanel({ live }: { live: LiveState }) {
  const [active, setActive] = useState<VitalKey | null>(null);
  const { current: c, history: h } = live;

  const vitals: { key: VitalKey; label: string; value: string; unit: string; icon: ReactNode; history: number[] }[] = [
    {
      key: "hr",
      label: "Heart Rate",
      value: String(c.hr),
      unit: "BPM",
      icon: <Icon name="heart" filled className="h-9 w-9 text-neon-red drop-shadow-[0_0_8px_rgba(255,60,60,0.8)]" />,
      history: h.hr,
    },
    {
      key: "bp",
      label: "Blood Pressure",
      value: `${c.sys}/${c.dia}`,
      unit: "mmHg",
      icon: <Icon name="drop" filled className="h-9 w-9 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />,
      history: h.sys,
    },
    {
      key: "spo2",
      label: "SpO₂",
      value: `${c.spo2}%`,
      unit: "",
      icon: <Icon name="lungs" filled className="h-9 w-9 text-sky-300 drop-shadow-[0_0_8px_rgba(125,211,252,0.8)]" strokeWidth={1.2} />,
      history: h.spo2,
    },
    {
      key: "temp",
      label: "Temperature",
      value: c.temp.toFixed(1),
      unit: "°C",
      icon: <Icon name="thermo" className="h-9 w-9 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" strokeWidth={2.2} />,
      history: h.temp,
    },
  ];

  return (
    <Panel className="overflow-hidden p-3">
      <div className="flex flex-col items-center gap-3 sm:h-[410px] sm:flex-row sm:items-stretch sm:gap-0">
        <div className="h-[340px] shrink-0 sm:h-full" style={{ aspectRatio: `${BODY_VIEW.w} / ${BODY_VIEW.h}` }}>
          <BodyHologram activeKey={active} onHover={setActive} />
        </div>

        {/* gutter: curved connectors from each marker to its card */}
        <div className="relative hidden w-7 shrink-0 sm:block" aria-hidden="true">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            {BODY_MARKERS.map((m, i) => {
              const y1 = (m.y / BODY_VIEW.h) * 100;
              const y2 = (i + 0.5) * 25;
              return (
                <path
                  key={m.key}
                  d={`M0,${y1} C55,${y1} 45,${y2} 100,${y2}`}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1.3"
                  strokeOpacity={active === m.key ? 1 : 0.55}
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>
        </div>

        <div className="grid h-[400px] w-full min-w-0 flex-1 grid-rows-4 sm:h-full">
          {vitals.map((v) => (
            <div key={v.key} className="py-1.5">
              <VitalCard
                label={v.label}
                value={v.value}
                unit={v.unit}
                icon={v.icon}
                history={v.history}
                active={active === v.key}
                onHover={(on) => setActive(on ? v.key : null)}
              />
            </div>
          ))}
        </div>
      </div>
    </Panel>
  );
}
