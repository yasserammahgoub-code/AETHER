import { useCallback, useMemo, useState } from "react";
import { DEMO_HISTORY } from "../data/history";
import { defaultQuality, getUnit, parseNumber, runCheck } from "../lib/checker/engine";
import { ILLUSTRATIVE_RULES } from "../lib/checker/rules";
import type { CheckResult, ParameterId, ParameterRule } from "../lib/checker/types";
import type { LiveVitals } from "../types";

export interface CheckerForm {
  current: string;
  baseline: string;
  unitId: string;
  contextId?: string;
  quality: Record<string, boolean>;
}

export interface Run {
  result: CheckResult;
  /** Serialised form at the time of the run; differs from the live form when inputs changed since. */
  key: string;
  /** The form as it was when the check ran (unit, context and the entered values). */
  form: CheckerForm;
  /** When the check ran (epoch ms); lets the trend graph plot it as a recorded measurement. */
  at: number;
}

const rules = ILLUSTRATIVE_RULES;
const keyOf = (f: CheckerForm) => JSON.stringify(f);

function blankForm(rule: ParameterRule): CheckerForm {
  return {
    current: "",
    baseline: rule.defaultBaseline,
    unitId: rule.units[0].id,
    contextId: rule.defaultContext,
    quality: defaultQuality(rule),
  };
}

/** The dashboard opens on the reference scenario: heart rate 85 vs baseline 72. */
function initialForms(): Record<ParameterId, CheckerForm> {
  const out = {} as Record<ParameterId, CheckerForm>;
  for (const id of rules.order) out[id] = blankForm(rules.parameters[id]);
  out.hr.current = "85";
  return out;
}

const run = (id: ParameterId, f: CheckerForm): Run => ({
  result: runCheck({ parameterId: id, ...f }, rules, DEMO_HISTORY),
  key: keyOf(f),
  form: f,
  at: Date.now(),
});

/** Latest live telemetry as text in the selected unit, when the parameter has a live source. */
export function liveReading(id: ParameterId, live: LiveVitals, rule: ParameterRule, unitId: string): string | null {
  const u = getUnit(rule, unitId);
  const dec = u.decimals ?? rule.components[0].decimals;
  switch (id) {
    case "hr":
      return String(live.hr);
    case "bp":
      return `${live.sys}/${live.dia}`;
    case "spo2":
      return String(live.spo2);
    case "temp":
      return u.fromCanonical(live.temp).toFixed(dec);
    default:
      return null;
  }
}

/** Shared state for the dashboard's quick panel and the full Parameter Checker view. */
export function useParameterChecker() {
  const [paramId, setParamId] = useState<ParameterId>("hr");
  const [forms, setForms] = useState(initialForms);
  const [runs, setRuns] = useState<Partial<Record<ParameterId, Run>>>(() => ({ hr: run("hr", initialForms().hr) }));

  const rule = rules.parameters[paramId];
  const form = forms[paramId];
  const current = runs[paramId] ?? null;
  const dirty = current !== null && current.key !== keyOf(form);

  const patch = useCallback(
    (p: Partial<CheckerForm>) => setForms((f) => ({ ...f, [paramId]: { ...f[paramId], ...p } })),
    [paramId],
  );

  const setQuality = useCallback(
    (qid: string, ok: boolean) =>
      setForms((f) => ({ ...f, [paramId]: { ...f[paramId], quality: { ...f[paramId].quality, [qid]: ok } } })),
    [paramId],
  );

  /** Switching unit converts the numbers already typed so they keep meaning the same thing. */
  const setUnit = useCallback(
    (unitId: string) =>
      setForms((all) => {
        const f = all[paramId];
        const from = getUnit(rule, f.unitId);
        const to = getUnit(rule, unitId);
        const dec = to.decimals ?? rule.components[0].decimals;
        const conv = (raw: string) => {
          const n = parseNumber(raw);
          return n === null ? raw : to.fromCanonical(from.toCanonical(n)).toFixed(dec);
        };
        return { ...all, [paramId]: { ...f, unitId, current: conv(f.current), baseline: conv(f.baseline) } };
      }),
    [paramId, rule],
  );

  const runCurrent = useCallback(() => setRuns((r) => ({ ...r, [paramId]: run(paramId, forms[paramId]) })), [paramId, forms]);

  /** Results of every parameter checked this session (used for the header status). */
  const flagged = useMemo(
    () =>
      Object.values(runs)
        .map((r) => r!.result)
        .filter((r) => r.state === "yellow" || r.state === "red"),
    [runs],
  );

  return {
    rules,
    rule,
    paramId,
    setParamId,
    form,
    patch,
    setQuality,
    setUnit,
    run: runCurrent,
    result: current?.result ?? null,
    /** The form values the current result was computed from. */
    ranForm: current?.form ?? null,
    dirty,
    runs,
    flagged,
    unmetQuality: rule.quality.filter((q) => form.quality[q.id] === false).length,
  };
}

export type ParameterChecker = ReturnType<typeof useParameterChecker>;
