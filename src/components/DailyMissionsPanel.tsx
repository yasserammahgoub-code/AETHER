import type { Mission } from "../types";
import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

interface Props {
  missions: Mission[];
  onToggle: (id: string) => void;
}

const RING_R = 52;
const RING_C = 2 * Math.PI * RING_R;

/** Score is derived from completion so toggling a mission visibly moves the ring. */
export function missionScore(done: number, total: number) {
  return Math.round(45 + (done / total) * 45);
}

export function DailyMissionsPanel({ missions, onToggle }: Props) {
  const done = missions.filter((m) => m.done).length;
  const total = missions.length;
  const score = missionScore(done, total);
  const message = done === total ? "Mission complete!" : done >= total / 2 ? "Keep it up!" : "Let's get going!";

  return (
    <Panel className="p-4">
      <PanelHeader
        icon="trophy"
        title="Daily Health Missions"
        iconClass="text-neon-amber"
        right={
          <span className="whitespace-nowrap text-sm font-semibold text-neon-amber">
            {done} / {total} Completed
          </span>
        }
      />

      <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ul className="w-full space-y-2 sm:w-auto" role="group" aria-label="Daily health missions">
          {missions.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={m.done}
                onClick={() => onToggle(m.id)}
                className="group flex w-full items-center gap-3 rounded-md text-left text-[15px] text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
              >
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                    m.done
                      ? "border-neon-green bg-neon-green text-space-950 shadow-[0_0_10px_rgba(34,224,122,0.6)]"
                      : "border-blue-300/60 text-transparent group-hover:border-neon-cyan"
                  }`}
                >
                  <Icon name="check" className="h-4 w-4" strokeWidth={3.4} />
                </span>
                <span className={m.done ? "" : "text-ink/90"}>{m.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center gap-3">
          <div className="relative grid h-[150px] w-[150px] place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#22d3ee" />
                  <stop offset="1" stopColor="#2dd4bf" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r={RING_R} fill="none" stroke="#12306b" strokeWidth="9" />
              <circle
                cx="60"
                cy="60"
                r={RING_R}
                fill="none"
                stroke="url(#ringGrad)"
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - score / 100)}
                style={{ transition: "stroke-dashoffset 0.6s ease", filter: "drop-shadow(0 0 6px #22d3ee)" }}
              />
            </svg>
            <div className="relative flex flex-col items-center leading-none">
              <Icon name="star" filled className="mb-0.5 h-7 w-7 text-neon-amber drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" strokeWidth={1} />
              <span className="text-[2.1rem] font-bold text-ink">{score}</span>
              <span className="mt-1 text-sm font-medium text-ink/90">Health Score</span>
            </div>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-violet-400/50 bg-violet-700/50 px-4 py-1.5 text-[15px] font-semibold text-violet-100 shadow-[0_0_14px_rgba(168,85,247,0.4)]">
            <Icon name="star" filled className="h-4 w-4" strokeWidth={1} />
            {message}
          </div>
        </div>
      </div>
    </Panel>
  );
}
