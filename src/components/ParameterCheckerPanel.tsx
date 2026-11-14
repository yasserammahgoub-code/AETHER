import { useId } from "react";
import type { ParameterChecker } from "../hooks/useParameterChecker";
import type { ParameterId } from "../lib/checker/types";
import { STATE_STYLE, StateIcon } from "./checker/state";
import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

const fieldBase =
  "w-full rounded-lg border bg-space-900/80 px-3 py-2 text-[15px] text-ink placeholder:text-mute focus:outline-none focus:ring-1";
const fieldOk = "border-blue-400/40 focus:border-neon-cyan/80 focus:ring-neon-cyan/60";
const fieldBad = "border-neon-red/70 focus:border-neon-red focus:ring-neon-red/60";

interface Props {
  checker: ParameterChecker;
  onOpenAnalysis: () => void;
}

/** Quick Check card on the dashboard. Shares its state with the full Parameter Checker view. */
export function ParameterCheckerPanel({ checker, onOpenAnalysis }: Props) {
  const { rules, rule, paramId, form, result, dirty, unmetQuality } = checker;
  const ids = { sel: useId(), cur: useId(), base: useId(), err: useId() };

  const unit = rule.units.find((u) => u.id === form.unitId) ?? rule.units[0];
  const context = rule.contexts?.find((c) => c.id === form.contextId);
  const curBad = !!result && !dirty && result.problems.some((p) => p.field === "current");
  const baseBad = !!result && !dirty && result.problems.some((p) => p.field === "baseline");

  const s = result ? STATE_STYLE[result.state] : null;
  const showWhy = result && !dirty && result.state !== "green" && result.reasons[0];

  return (
    <Panel className="flex flex-col p-4">
      <PanelHeader
        icon="sliders"
        title="Parameter Checker"
        right={<span className="text-sm font-semibold text-neon-amber">Quick Check</span>}
      />

      <form
        className="mt-4 flex flex-1 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          checker.run();
        }}
        noValidate
      >
        <div className="relative">
          <label htmlFor={ids.sel} className="sr-only">
            Parameter
          </label>
          <select
            id={ids.sel}
            value={paramId}
            onChange={(e) => checker.setParamId(e.target.value as ParameterId)}
            className={`${fieldBase} ${fieldOk} cursor-pointer appearance-none pr-10`}
          >
            {rules.order.map((id) => (
              <option key={id} value={id} className="bg-space-900">
                {rules.parameters[id].label}
              </option>
            ))}
          </select>
          <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids.cur} className="mb-1 block text-[15px] text-ink">
              Current Value
            </label>
            <input
              id={ids.cur}
              inputMode={paramId === "bp" ? "text" : "decimal"}
              autoComplete="off"
              value={form.current}
              placeholder={rule.placeholder}
              onChange={(e) => checker.patch({ current: e.target.value })}
              aria-invalid={curBad}
              aria-describedby={curBad ? ids.err : undefined}
              className={`${fieldBase} ${curBad ? fieldBad : fieldOk}`}
            />
          </div>
          <div>
            <label htmlFor={ids.base} className="mb-1 block text-[15px] text-ink">
              Baseline
            </label>
            <input
              id={ids.base}
              inputMode={paramId === "bp" ? "text" : "decimal"}
              autoComplete="off"
              value={form.baseline}
              placeholder="optional"
              onChange={(e) => checker.patch({ baseline: e.target.value })}
              aria-invalid={baseBad}
              className={`${fieldBase} ${baseBad ? fieldBad : fieldOk}`}
            />
          </div>
        </div>

        <p className="-mt-1 text-xs text-mute">
          {[unit.label, context?.label].filter(Boolean).join(" · ")}
          {" · "}
          {unmetQuality === 0 ? (
            "standard conditions assumed"
          ) : (
            <span className="text-neon-amber">
              {unmetQuality} condition{unmetQuality === 1 ? "" : "s"} not met
            </span>
          )}
        </p>

        <div className="min-h-[44px]" aria-live="polite" id={ids.err}>
          {dirty && <div className="text-[15px] text-mute">Inputs changed — press Run Check to update.</div>}
          {!result && !dirty && <div className="text-[15px] text-mute">Enter a measurement and press Run Check.</div>}
          {result && !dirty && s && (
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5">
                <StateIcon state={result.state} />
              </span>
              <div className="min-w-0">
                <div className={`text-[15px] font-medium leading-snug ${s.text}`}>
                  <span className="sr-only">{s.label}: </span>
                  {result.headline}
                </div>
                <div className="text-xs text-mute">{result.state === "unavailable" ? result.reasons[0]?.text : result.summary}</div>
                {showWhy && result.state !== "unavailable" && (
                  <div className="mt-1 line-clamp-2 text-xs text-ink/80">{result.reasons[0].text}</div>
                )}
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenAnalysis}
          className="-mb-1 flex items-center gap-1.5 self-start text-sm font-medium text-neon-cyan hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
        >
          Full analysis, quality checks &amp; next steps
          <Icon name="arrowRight" className="h-4 w-4" />
        </button>

        <button
          type="submit"
          className="mx-auto mt-auto w-3/5 min-w-[160px] rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 py-2.5 text-lg font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80"
        >
          Run Check
        </button>
      </form>
    </Panel>
  );
}
