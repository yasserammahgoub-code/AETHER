import type { ParameterChecker } from "../hooks/useParameterChecker";
import type { CheckResult } from "../lib/checker/types";
import { referenceTable } from "../lib/referenceRules";
import { PARAM_NAME, STATE_STYLE, StateIcon } from "./checker/state";
import { Panel, PanelHeader } from "./ui/Panel";

/** One short line saying what the colour means for this reading. */
function describe(result: CheckResult): string {
  switch (result.state) {
    case "green":
      return "Normal Range";
    case "yellow":
      return result.evaluations.some((e) => e.rangeState !== "green") ? "Outside Normal Range" : "In Range, Monitor";
    case "red":
      return "Outside Safe Range";
    default:
      return "Can't Assess";
  }
}

/** Parameter name, colour-coded status, measured value and the reference range: nothing else. */
export function AssessmentPanel({ checker }: { checker: ParameterChecker }) {
  const { rule, paramId, result, ranForm, form, dirty } = checker;
  const name = PARAM_NAME[paramId];
  const assessed = result && ranForm;
  const s = assessed ? STATE_STYLE[result.state] : null;
  const usable = assessed && result.state !== "unavailable";

  const unit = assessed ? (rule.units.find((u) => u.label === result.unitLabel) ?? rule.units[0]) : null;
  const value =
    usable && unit
      ? result.evaluations
          .map((e) => unit.fromCanonical(e.value).toFixed(unit.decimals ?? rule.components.find((c) => c.key === e.key)!.decimals))
          .join("/")
      : null;
  const reference = referenceTable(rule, unit?.id ?? form.unitId, ranForm?.contextId ?? form.contextId).rows[0].cells.join(" / ");
  const unavailableWhy = assessed && result.state === "unavailable" ? (result.problems[0]?.message ?? result.reasons[0]?.text) : null;

  return (
    <Panel className="flex flex-col p-4 sm:p-5">
      <PanelHeader icon="activity" title="Assessment" />

      <div className="mt-3 flex flex-1 items-center gap-4" aria-live="polite">
        <StateIcon state={assessed ? result.state : "unavailable"} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-semibold leading-tight text-ink">{name}</div>

          {assessed && s ? (
            <>
              <div className={`text-2xl font-bold leading-tight ${s.text}`}>
                <span className="sr-only">{s.label}: </span>
                {describe(result)}
              </div>
              {value !== null ? (
                <div className="text-2xl font-bold leading-tight text-ink">
                  {value} {result.unitLabel}
                </div>
              ) : (
                <p className="line-clamp-2 text-sm text-mute">{unavailableWhy}</p>
              )}
            </>
          ) : (
            <>
              <div className="text-2xl font-bold leading-tight text-mute">No check yet</div>
              <p className="text-sm text-mute">Enter a value and press Check.</p>
            </>
          )}

          <div className="mt-2 border-t border-blue-400/30 pt-2 text-sm text-ink/85">
            Reference: {reference} {unit?.label ?? rule.units.find((u) => u.id === form.unitId)?.label}
          </div>
          {assessed && result.escalate && <div className="mt-1 text-sm font-semibold text-neon-red">Contact mission medical support now.</div>}
          {dirty && <div className="mt-1 text-xs text-neon-amber">Inputs changed. Press Check to update.</div>}
        </div>
      </div>
    </Panel>
  );
}
