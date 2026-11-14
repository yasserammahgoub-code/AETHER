import type { ReactNode } from "react";
import { checklistProgress, escalationFor, LEVEL_INFO, utcTime } from "../../lib/emergency/engine";
import type { ActivationMethod, CommKind, ForWhom, PathwayId, PathwayState, ProtocolSet } from "../../lib/emergency/types";
import type { LiveVitals } from "../../types";
import { Icon } from "../ui/Icon";
import { Measurements } from "./Measurements";
import { EmPanel, focusRing, MethodBadge } from "./ui";

interface Props {
  protocols: ProtocolSet;
  pathwayId: PathwayId;
  state: PathwayState | undefined;
  forWhom: ForWhom;
  live: LiveVitals;
  startedAt: string | null;
  method: ActivationMethod | null;
  /** Column 3: crew assistance, Flight Surgeon notification and event log. */
  aside: ReactNode;
  onSelectPathway: (id: PathwayId) => void;
  onBack: () => void;
  onForWhom: (w: ForWhom) => void;
  onToggleSymptom: (id: string) => void;
  onValue: (mid: string, value: string) => void;
  onToggleCheck: (id: string) => void;
  onCompose: (kind: CommKind) => void;
}

function EscalationBanner({
  pathwayId,
  protocols,
  state,
  onCompose,
}: Pick<Props, "pathwayId" | "protocols" | "state" | "onCompose">) {
  const e = escalationFor(protocols.pathways[pathwayId], state);
  if (e.level === "prompt" && !e.hasSymptoms) return null;
  const info = LEVEL_INFO[e.level];

  const tone =
    e.level === "immediate"
      ? "border-white/60 bg-neon-red text-white shadow-[0_0_30px_rgba(255,59,59,0.55)]"
      : e.level === "urgent"
        ? "border-orange-300/70 bg-orange-700/70 text-white"
        : "border-blue-400/50 bg-blue-950/70 text-emg-ink";

  return (
    <div role={e.level === "immediate" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 sm:px-5 ${tone}`}>
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <Icon name="alert" className="mt-0.5 h-7 w-7 shrink-0" filled strokeWidth={1.4} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold leading-snug">Escalation level: {info.label}</p>
          <p className="mt-0.5 text-[15px] leading-snug">{info.action}</p>
          {e.triggers.length > 0 && <p className="mt-1 text-sm leading-snug opacity-95">Because you selected: {e.triggers.join("; ")}.</p>}
          <p className="mt-1 text-xs leading-snug opacity-90">
            {e.level === "prompt"
              ? "This is not an all-clear. Notify the Flight Surgeon and keep your crew informed."
              : "The level reflects the items you selected. It is not a diagnosis."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onCompose("crew")}
            className={`rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 ${focusRing}`}
          >
            Request crew assistance
          </button>
          <button
            type="button"
            onClick={() => onCompose("surgeon")}
            className={`rounded-lg border border-white/80 px-4 py-2 text-sm font-bold text-white hover:bg-white/15 ${focusRing}`}
          >
            Notify Flight Surgeon
          </button>
        </div>
      </div>
    </div>
  );
}

/** Screen 2: three columns on wide screens (symptoms and readings | response checklist | communication and log). */
export function PathwayWorkspace(props: Props) {
  const { protocols, pathwayId, state, forWhom, live } = props;
  const pathway = protocols.pathways[pathwayId];
  const { done, total } = checklistProgress(pathway, state);
  const selectedCount = pathway.symptoms.filter((s) => state?.symptoms[s.id]).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Category band */}
      <section className="emg-hero flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3.5 sm:px-6" aria-label="Selected emergency category">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-white/70 bg-neon-red text-white">
          <Icon name={pathway.icon} className="h-8 w-8" strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-extrabold text-white">{pathway.title}</h2>
          <p className="text-[15px] text-white/80">{pathway.short}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="text-right text-sm leading-tight text-white/85">
            <div className="text-xs text-white/60">Emergency activated</div>
            <div className="font-mono text-base font-semibold text-white">{props.startedAt ? utcTime(props.startedAt) : "n/a"}</div>
          </div>
          <MethodBadge method={props.method} />
          <button
            type="button"
            onClick={props.onBack}
            className={`flex items-center gap-2 rounded-xl border border-white/50 bg-black/25 px-3.5 py-2 text-sm font-semibold text-white hover:bg-white/10 ${focusRing}`}
          >
            <Icon name="arrowLeft" className="h-4 w-4" />
            All categories
          </button>
        </div>
      </section>

      {/* Category switcher and who it is for */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Emergency categories" className="no-scrollbar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 pb-1">
          {protocols.order.map((id) => {
            const p = protocols.pathways[id];
            const on = id === pathwayId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => props.onSelectPathway(id)}
                aria-current={on ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${focusRing} ${
                  on
                    ? "border-white/70 bg-neon-red text-white shadow-[0_0_18px_rgba(255,59,59,0.5)]"
                    : "border-blue-400/40 bg-blue-950/60 text-emg-ink hover:bg-blue-900/50"
                }`}
              >
                <Icon name={p.icon} className="h-5 w-5" />
                <span className="whitespace-nowrap">{p.title}</span>
              </button>
            );
          })}
        </nav>
        <div role="radiogroup" aria-label="Who is this emergency for?" className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-emg-mute">This is for</span>
          {(["self", "crew"] as const).map((w) => {
            const on = forWhom === w;
            return (
              <button
                key={w}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => props.onForWhom(w)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${focusRing} ${
                  on ? "border-white/70 bg-blue-700 text-white" : "border-blue-400/40 bg-blue-950/60 text-emg-ink hover:bg-blue-900/50"
                }`}
              >
                {w === "self" ? "Me" : "Another crew member"}
              </button>
            );
          })}
        </div>
      </div>

      <EscalationBanner pathwayId={pathwayId} protocols={protocols} state={state} onCompose={props.onCompose} />

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* COLUMN 1: symptoms and health measurements */}
        <div className="flex min-w-0 flex-col gap-4">
          <EmPanel
            title="Symptoms"
            icon="clipboard"
            tone="blue"
            right={<span className="text-sm text-emg-mute">{selectedCount} selected</span>}
          >
            <p className="mb-3 text-sm leading-relaxed text-emg-mute">
              Select everything that applies. Items marked Immediate or Urgent raise the escalation level.
            </p>
            <ul className="flex flex-col gap-1">
              {pathway.symptoms.map((s) => {
                const on = !!state?.symptoms[s.id];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => props.onToggleSymptom(s.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-[15px] leading-snug ${focusRing} ${
                        on ? "border-white/60 bg-neon-red/85 text-white" : "border-emg-line/40 bg-emg-900/70 text-emg-ink hover:bg-emg-800"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 ${
                          on ? "border-white bg-white text-red-700" : "border-emg-mute/70"
                        }`}
                      >
                        {on && <Icon name="check" className="h-4 w-4" strokeWidth={3.5} />}
                      </span>
                      <span className="min-w-0 flex-1">{s.label}</span>
                      {s.level && (
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${
                            on ? "bg-white/90 text-red-800" : s.level === "immediate" ? "bg-neon-red/25 text-red-200" : "bg-orange-500/20 text-orange-200"
                          }`}
                        >
                          {LEVEL_INFO[s.level].label}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </EmPanel>
          <Measurements pathway={pathway} state={state} live={live} onValue={props.onValue} />
        </div>

        {/* COLUMN 2: response checklist */}
        <div className="min-w-0">
          <EmPanel
            title="Response checklist"
            icon="list"
            tone="hot"
            right={
              <span className="rounded-full bg-black/30 px-3 py-1 text-sm font-bold text-white" aria-label={`${done} of ${total} steps done`}>
                {done} of {total} done
              </span>
            }
          >
            {protocols.meta.status === "illustrative" && (
              <p className="mb-3 rounded-lg border border-orange-300/50 bg-orange-950/50 px-3 py-2 text-xs leading-snug text-orange-100">
                <strong>Illustrative checklist.</strong> {protocols.meta.disclaimer}
              </p>
            )}
            <div className="mb-4 flex items-center gap-3">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/40" aria-hidden="true">
                <div className="h-full rounded-full bg-neon-green transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 text-right text-sm font-bold text-neon-green">{pct}%</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {pathway.checklist.map((c, i) => {
                const at = state?.checked[c.id];
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={!!at}
                      onClick={() => props.onToggleCheck(c.id)}
                      className={`flex w-full items-start gap-3.5 rounded-xl border px-4 py-3.5 text-left ${focusRing} ${
                        at
                          ? "border-neon-green/70 bg-emerald-950/60"
                          : "border-red-300/40 bg-black/25 hover:border-red-200/70 hover:bg-red-950/50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border-2 text-sm font-bold ${
                          at ? "border-neon-green bg-neon-green text-emerald-950" : "border-red-200/70 text-red-100"
                        }`}
                      >
                        {at ? <Icon name="check" className="h-5 w-5" strokeWidth={3.5} /> : i + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[17px] font-semibold leading-snug text-white">{c.text}</span>
                        {c.detail && <span className="mt-1 block text-[15px] leading-snug text-emg-mute">{c.detail}</span>}
                        <span className={`mt-1 block text-xs font-semibold ${at ? "text-neon-green" : "text-red-200/80"}`}>
                          {at ? `Done ${utcTime(at)}` : "Not done"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </EmPanel>
        </div>

        {/* COLUMN 3: communication and event log */}
        {props.aside}
      </div>
    </div>
  );
}
