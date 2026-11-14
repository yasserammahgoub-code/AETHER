import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

interface Props {
  /** Daily sleep hours, oldest -> newest. */
  sleep: number[];
}

/** Derives the insight from the telemetry instead of hard-coding it. */
export function HealthInsightPanel({ sleep }: Props) {
  const recent = sleep.slice(-3);
  const drop = recent[0] - recent[recent.length - 1];
  const low = drop >= 1;
  const latest = sleep[sleep.length - 1];

  const title = low ? "Sleep Duration Trending Low" : "Sleep Duration Stable";
  const body = low
    ? `Your sleep has decreased by ${drop.toFixed(1)}h over the past ${recent.length} days.`
    : `You averaged ${(recent.reduce((a, b) => a + b, 0) / recent.length).toFixed(1)}h of sleep over the past ${recent.length} days.`;
  const actions = low
    ? ["Try to get at least 7 hours of sleep tonight", "Reduce screen time before bed", "Contact support if this continues"]
    : ["Keep your current sleep schedule", "Log how rested you feel each morning"];

  return (
    <Panel className="flex flex-col p-4">
      <PanelHeader
        icon="bulb"
        title="Health Insight"
        iconClass="text-neon-amber"
        right={
          <span
            className={`rounded-full px-4 py-1 text-sm font-bold text-space-950 ${
              low ? "bg-neon-amber shadow-[0_0_14px_rgba(250,204,21,0.45)]" : "bg-neon-green"
            }`}
          >
            {low ? "Attention" : "Normal"}
          </span>
        }
      />

      <div className="mt-4 flex items-start gap-4">
        <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full border-2 border-neon-amber/70 bg-space-800/80 shadow-[0_0_18px_rgba(250,204,21,0.25)]">
          <Icon name="bed" className="h-9 w-9 text-sky-300" strokeWidth={1.6} />
        </div>
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight text-ink">{title}</h3>
          <p className="mt-1 text-[15px] leading-snug text-ink/90">{body}</p>
          <p className="mt-1 text-xs text-mute">Last night: {latest.toFixed(1)}h</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 text-[15px] font-medium text-ink">Suggested Actions:</div>
        <ul className="space-y-1.5">
          {actions.map((a) => (
            <li key={a} className="flex items-start gap-2.5 text-[15px] text-ink/95">
              <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-neon-green" strokeWidth={3} />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
