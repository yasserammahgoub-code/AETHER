import { useId } from "react";
import type { ParameterChecker } from "../hooks/useParameterChecker";
import type { ParameterId } from "../lib/checker/types";
import { PARAM_NAME, PARAM_ORDER_ICON } from "./checker/state";
import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

const fieldBase =
  "w-full rounded-lg border bg-space-900/80 px-3 py-2 text-[15px] text-ink placeholder:text-mute focus:outline-none focus:ring-1";
const fieldOk = "border-blue-400/40 focus:border-neon-cyan/80 focus:ring-neon-cyan/60";
const fieldBad = "border-neon-red/70 focus:border-neon-red focus:ring-neon-red/60";

interface Props {
  checker: ParameterChecker;
}

/**
 * Compact checker on the Parameter Checker page: one dropdown for all seven parameters, the inputs for the selected one,
 * and a Check button. The verdict is shown in the Assessment panel. Shares its state with the full view.
 */
export function AetherCheckerPanel({ checker }: Props) {
  const { rules, rule, paramId, form, result, dirty, unmetQuality } = checker;
  const ids = { sel: useId(), cur: useId(), base: useId() };

  const unit = rule.units.find((u) => u.id === form.unitId) ?? rule.units[0];
  const context = rule.contexts?.find((c) => c.id === form.contextId);
  const curBad = !!result && !dirty && result.problems.some((p) => p.field === "current");
  const baseBad = !!result && !dirty && result.problems.some((p) => p.field === "baseline");

  return (
    <Panel className="flex flex-col p-4 sm:p-5">
      <PanelHeader icon="clipboard" title="Parameter Checker" />

      <form
        className="mt-3 flex flex-1 flex-col gap-3"
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
          <Icon name={PARAM_ORDER_ICON[paramId]} className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
          <select
            id={ids.sel}
            value={paramId}
            onChange={(e) => checker.setParamId(e.target.value as ParameterId)}
            className={`${fieldBase} ${fieldOk} cursor-pointer appearance-none py-2.5 pl-11 pr-10 text-base`}
          >
            {rules.order.map((id) => (
              <option key={id} value={id} className="bg-space-900">
                {PARAM_NAME[id]}
              </option>
            ))}
          </select>
          <Icon name="chevron" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor={ids.cur} className="mb-1 block text-sm text-ink/90">
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
              className={`${fieldBase} ${curBad ? fieldBad : fieldOk}`}
            />
          </div>
          <div>
            <label htmlFor={ids.base} className="mb-1 block text-sm text-ink/90">
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

        <button
          type="submit"
          className="mt-auto w-full rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 py-2.5 text-lg font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80"
        >
          Check
        </button>

      </form>
    </Panel>
  );
}
