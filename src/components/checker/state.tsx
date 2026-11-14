import type { CheckState, ParameterId } from "../../lib/checker/types";
import { Icon, type IconName } from "../ui/Icon";

/** Visual language for the four checker states. Never colour-only: each has its own icon and word. */
export const STATE_STYLE: Record<
  CheckState,
  { label: string; text: string; bg: string; border: string; glow: string; icon: IconName; dot: string }
> = {
  green: {
    label: "GREEN",
    text: "text-neon-green",
    bg: "bg-neon-green",
    border: "border-neon-green/60",
    glow: "shadow-[0_0_22px_rgba(34,224,122,0.28)]",
    icon: "check",
    dot: "bg-neon-green",
  },
  yellow: {
    label: "YELLOW",
    text: "text-neon-amber",
    bg: "bg-neon-amber",
    border: "border-neon-amber/60",
    glow: "shadow-[0_0_22px_rgba(250,204,21,0.25)]",
    icon: "alert",
    dot: "bg-neon-amber",
  },
  red: {
    label: "RED",
    text: "text-neon-red",
    bg: "bg-neon-red",
    border: "border-neon-red/60",
    glow: "shadow-[0_0_22px_rgba(255,59,59,0.3)]",
    icon: "alert",
    dot: "bg-neon-red",
  },
  unavailable: {
    label: "UNAVAILABLE",
    text: "text-mute",
    bg: "bg-mute",
    border: "border-mute/50",
    glow: "",
    icon: "help",
    dot: "bg-mute",
  },
};

export function StateDot({ state }: { state: CheckState | undefined }) {
  if (!state) return null;
  const s = STATE_STYLE[state];
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} title={s.label} aria-hidden="true" />;
}

export function StateIcon({ state, className = "h-6 w-6" }: { state: CheckState; className?: string }) {
  const s = STATE_STYLE[state];
  return (
    <span className={`grid shrink-0 place-items-center rounded-full text-space-950 ${s.bg} ${className}`}>
      <Icon name={s.icon} className="h-[68%] w-[68%]" strokeWidth={3} />
    </span>
  );
}

export const PARAM_ORDER_ICON: Record<ParameterId, IconName> = {
  hr: "heart",
  bp: "drop",
  glucose: "drop",
  spo2: "lungs",
  temp: "thermo",
  sleep: "bed",
  resp: "lungs",
};

/** Names used for the parameter dropdown, graph title and Assessment panel. */
export const PARAM_NAME: Record<ParameterId, string> = {
  hr: "Heart Rate",
  bp: "Blood Pressure",
  glucose: "Blood Glucose",
  spo2: "Blood Oxygen (SpO₂)",
  temp: "Body Temperature",
  sleep: "Sleep Duration",
  resp: "Respiratory Rate",
};
