import { useId } from "react";
import { dayLabels } from "../lib/health";
import { DEMO_HISTORY } from "../data/history";
import { getBands, MIN_TREND_POINTS } from "../lib/checker/engine";
import type { ComponentEvaluation, ComponentRule, ParameterId, Reason, UnitOption } from "../lib/checker/types";
import { liveReading, type ParameterChecker } from "../hooks/useParameterChecker";
import type { LiveVitals } from "../types";
import { CheckerTrendChart } from "./checker/CheckerTrendChart";
import { PARAM_ORDER_ICON, STATE_STYLE, StateDot, StateIcon } from "./checker/state";
import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

const fieldBase =
  "w-full rounded-lg border bg-space-900/80 px-3 py-2 text-[15px] text-ink placeholder:text-mute focus:outline-none focus:ring-1";
const fieldOk = "border-blue-400/40 focus:border-neon-cyan/80 focus:ring-neon-cyan/60";
const fieldBad = "border-neon-red/70 focus:border-neon-red focus:ring-neon-red/60";

interface Props {
  checker: ParameterChecker;
  live: LiveVitals;
  onEmergency: () => void;
}

const dec = (c: ComponentRule, u: UnitOption) => u.decimals ?? c.decimals;

const REASON_ICON: Record<Reason["severity"], { icon: "check" | "alert" | "info" | "help"; cls: string }> = {
  green: { icon: "check", cls: "text-neon-green" },
  yellow: { icon: "alert", cls: "text-neon-amber" },
  red: { icon: "alert", cls: "text-neon-red" },
  unavailable: { icon: "help", cls: "text-mute" },
  info: { icon: "info", cls: "text-sky-300" },
};

const REASON_SR: Record<Reason["severity"], string> = {
  green: "Within range",
  yellow: "Caution",
  red: "Urgent",
  unavailable: "Blocks assessment",
  info: "Note",
};

/** Full Parameter Checker view: inputs, quality checks, verdict, reasons, next steps, trends, reference rules. */
export function ParameterCheckerPageClassic({ checker, live, onEmergency }: Props) {
  const { rules, rule, paramId, form, result, dirty } = checker;
  const ids = { cur: useId(), base: useId(), unit: useId(), ctx: useId(), curErr: useId(), baseErr: useId() };

  const unit = rule.units.find((u) => u.id === form.unitId) ?? rule.units[0];
  const problem = (f: "current" | "baseline") => result?.problems.find((p) => p.field === f && !dirty)?.message;
  const curErr = problem("current");
  const baseErr = problem("baseline");
  const liveText = liveReading(paramId, live, rule, form.unitId);
  const resultUnit = result ? (rule.units.find((u) => u.label === result.unitLabel) ?? unit) : unit;
  const s = result ? STATE_STYLE[result.state] : null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ------------------------------------------------------------ inputs */}
        <Panel className="flex flex-col p-4">
          <PanelHeader
            icon="sliders"
            title="Parameter Checker"
            right={<span className="text-sm font-semibold text-neon-amber">Full Analysis</span>}
          />

          <form
            className="mt-4 flex flex-1 flex-col gap-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              checker.run();
            }}
          >
            <fieldset>
              <legend className="mb-2 text-[15px] text-ink">Parameter</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
                {rules.order.map((id: ParameterId) => {
                  const active = id === paramId;
                  const last = checker.runs[id]?.result.state;
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => checker.setParamId(id)}
                      className={[
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70",
                        active
                          ? "border-blue-400/70 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_16px_rgba(59,130,246,0.5)]"
                          : "border-blue-400/30 bg-space-900/60 text-ink/90 hover:border-neon-cyan/60",
                      ].join(" ")}
                    >
                      <Icon name={PARAM_ORDER_ICON[id]} className={`h-5 w-5 shrink-0 ${active ? "text-white" : "text-neon-blue"}`} />
                      <span className="min-w-0 flex-1 leading-tight">{rules.parameters[id].shortLabel}</span>
                      <StateDot state={last} />
                      {last && <span className="sr-only">last check {STATE_STYLE[last].label}</span>}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {(rule.contexts || rule.units.length > 1) && (
              <div className="grid grid-cols-2 gap-3">
                {rule.contexts && (
                  <div className={rule.units.length > 1 ? "" : "col-span-2"}>
                    <label htmlFor={ids.ctx} className="mb-1 block text-[15px] text-ink">
                      Measurement context
                    </label>
                    <select
                      id={ids.ctx}
                      value={form.contextId}
                      onChange={(e) => checker.patch({ contextId: e.target.value })}
                      className={`${fieldBase} ${fieldOk} cursor-pointer`}
                    >
                      {rule.contexts.map((c) => (
                        <option key={c.id} value={c.id} className="bg-space-900">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                {rule.units.length > 1 && (
                  <div className={rule.contexts ? "" : "col-span-2"}>
                    <label htmlFor={ids.unit} className="mb-1 block text-[15px] text-ink">
                      Unit
                    </label>
                    <select
                      id={ids.unit}
                      value={form.unitId}
                      onChange={(e) => checker.setUnit(e.target.value)}
                      className={`${fieldBase} ${fieldOk} cursor-pointer`}
                    >
                      {rule.units.map((u) => (
                        <option key={u.id} value={u.id} className="bg-space-900">
                          {u.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <label htmlFor={ids.cur} className="text-[15px] text-ink">
                    Current Value <span className="text-xs text-mute">({unit.label})</span>
                  </label>
                  {liveText && (
                    <button
                      type="button"
                      onClick={() => checker.patch({ current: liveText })}
                      className="text-xs font-medium text-neon-cyan hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
                    >
                      Use live ({liveText})
                    </button>
                  )}
                </div>
                <input
                  id={ids.cur}
                  inputMode={paramId === "bp" ? "text" : "decimal"}
                  autoComplete="off"
                  value={form.current}
                  placeholder={rule.placeholder}
                  onChange={(e) => checker.patch({ current: e.target.value })}
                  aria-invalid={!!curErr}
                  aria-describedby={curErr ? ids.curErr : undefined}
                  className={`${fieldBase} ${curErr ? fieldBad : fieldOk}`}
                />
              </div>
              <div>
                <label htmlFor={ids.base} className="mb-1 block text-[15px] text-ink">
                  Personal Baseline <span className="text-xs text-mute">(optional)</span>
                </label>
                <input
                  id={ids.base}
                  inputMode={paramId === "bp" ? "text" : "decimal"}
                  autoComplete="off"
                  value={form.baseline}
                  placeholder="none"
                  onChange={(e) => checker.patch({ baseline: e.target.value })}
                  aria-invalid={!!baseErr}
                  aria-describedby={baseErr ? ids.baseErr : undefined}
                  className={`${fieldBase} ${baseErr ? fieldBad : fieldOk}`}
                />
              </div>
            </div>
            {(curErr || baseErr) && (
              <div className="-mt-2 space-y-1 text-sm text-neon-red">
                {curErr && (
                  <p id={ids.curErr} role="alert">
                    {curErr}
                  </p>
                )}
                {baseErr && (
                  <p id={ids.baseErr} role="alert">
                    Baseline: {baseErr}
                  </p>
                )}
              </div>
            )}

            <fieldset>
              <legend className="mb-1 text-[15px] text-ink">Measurement quality</legend>
              <p className="mb-2 text-xs text-mute">Untick any condition that was not met. Required conditions block the assessment.</p>
              <ul className="space-y-2">
                {rule.quality.map((q) => {
                  const ok = form.quality[q.id] !== false;
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={ok}
                        onClick={() => checker.setQuality(q.id, !ok)}
                        className="group flex w-full items-start gap-3 rounded-md text-left text-[15px] text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
                      >
                        <span
                          className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                            ok
                              ? "border-neon-green bg-neon-green text-space-950 shadow-[0_0_10px_rgba(34,224,122,0.6)]"
                              : "border-neon-amber text-neon-amber"
                          }`}
                        >
                          <Icon name={ok ? "check" : "close"} className="h-4 w-4" strokeWidth={3.2} />
                        </span>
                        <span className="min-w-0">
                          <span className={ok ? "" : "text-ink/90"}>{q.label}</span>
                          <span className={`ml-2 whitespace-nowrap text-xs ${q.severity === "blocking" ? "text-neon-amber" : "text-mute"}`}>
                            {q.severity === "blocking" ? "required" : "affects confidence"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>

            <button
              type="submit"
              className="mx-auto mt-auto w-3/5 min-w-[160px] rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 py-2.5 text-lg font-semibold text-white shadow-[0_0_20px_rgba(59,130,246,0.55)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80"
            >
              Run Check
            </button>
          </form>
        </Panel>

        {/* ------------------------------------------------------------ result */}
        <Panel className="flex flex-col p-4">
          <PanelHeader
            icon="shield"
            title="Assessment"
            right={
              <span
                className="rounded-full border border-neon-amber/60 px-3 py-0.5 text-xs font-bold tracking-wide text-neon-amber"
                title={rules.meta.disclaimer}
              >
                ILLUSTRATIVE RULES
              </span>
            }
          />

          <div className="mt-4 flex flex-1 flex-col gap-4" aria-live="polite">
            {!result && (
              <p className="text-[15px] text-mute">Enter a measurement and press Run Check to see the assessment, the reasons and next steps.</p>
            )}

            {result && s && (
              <>
                <div className={`flex items-center gap-4 rounded-2xl border bg-space-900/50 px-4 py-3.5 ${s.border} ${s.glow} ${dirty ? "opacity-60" : ""}`}>
                  <StateIcon state={result.state} className="h-12 w-12" />
                  <div className="min-w-0">
                    <div className="text-xl font-bold">
                      {result.parameterLabel.replace(/ \(.*\)$/, "")}: <span className={s.text}>{s.label}</span>
                    </div>
                    <div className="text-[15px] leading-snug text-ink/90">{result.headline}</div>
                    <div className="text-xs text-mute">
                      {result.summary}
                      {result.contextLabel ? ` · ${result.contextLabel}` : ""}
                    </div>
                  </div>
                </div>

                {dirty && (
                  <p className="-mt-2 text-sm text-neon-amber">Inputs changed since this check — press Run Check to update.</p>
                )}
                {result.confidence === "reduced" && (
                  <p className="-mt-2 flex items-center gap-2 text-sm text-neon-amber">
                    <Icon name="info" className="h-4 w-4 shrink-0" /> Reduced confidence — a measurement condition was not met.
                  </p>
                )}

                <section aria-labelledby="why-h">
                  <h3 id="why-h" className="mb-1.5 text-[15px] font-semibold text-ink">
                    {result.state === "green" ? "Why this result" : result.state === "unavailable" ? "Why no assessment" : "Why this needs attention"}
                  </h3>
                  <ul className="space-y-2">
                    {result.reasons.map((r, i) => {
                      const ic = REASON_ICON[r.severity];
                      return (
                        <li key={i} className="flex items-start gap-2.5 text-[15px] leading-snug text-ink/95">
                          <Icon name={ic.icon} className={`mt-0.5 h-5 w-5 shrink-0 ${ic.cls}`} strokeWidth={ic.icon === "check" ? 3 : 2} />
                          <span>
                            <span className="sr-only">{REASON_SR[r.severity]}: </span>
                            {r.text}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>

                <section aria-labelledby="next-h">
                  <h3 id="next-h" className="mb-1.5 text-[15px] font-semibold text-ink">
                    Recommended next steps
                  </h3>
                  <ul className="space-y-1.5">
                    {result.nextSteps.map((t) => (
                      <li key={t} className="flex items-start gap-2.5 text-[15px] text-ink/95">
                        <Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-neon-green" strokeWidth={3} />
                        {t}
                      </li>
                    ))}
                  </ul>
                  {result.escalate && (
                    <button
                      type="button"
                      onClick={onEmergency}
                      className="mt-3 flex items-center gap-2 rounded-xl border border-red-300/40 bg-gradient-to-b from-red-500 to-red-700 px-5 py-2.5 font-bold text-white shadow-[0_0_22px_rgba(255,40,40,0.5)] transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                    >
                      <Icon name="alert" className="h-5 w-5" filled strokeWidth={1.4} />
                      Open Emergency Mode
                    </button>
                  )}
                </section>
              </>
            )}

            <p className="mt-auto border-t border-line/40 pt-3 text-xs leading-snug text-mute">
              If you have chest pain, trouble breathing, fainting or confusion, use Emergency Mode regardless of any result here.{" "}
              {rules.meta.disclaimer}
            </p>
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <TrendPanel checker={checker} resultUnit={resultUnit} />
        <RulesPanel checker={checker} unit={unit} />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- trends */

function TrendPanel({ checker, resultUnit }: { checker: ParameterChecker; resultUnit: UnitOption }) {
  const { rule, result, form } = checker;
  const u = result ? resultUnit : (rule.units.find((x) => x.id === form.unitId) ?? rule.units[0]);
  const evals = result?.evaluations ?? [];
  const yesterday = new Date(Date.now() - 86_400_000);

  return (
    <Panel className="p-4">
      <PanelHeader
        icon="chart"
        title="Trend Analysis"
        right={<span className="text-sm text-mute">last {DEMO_HISTORY[rule.id][rule.components[0].key].length} days + this check</span>}
      />
      <div className={`mt-3 grid gap-4 ${rule.components.length > 1 ? "lg:grid-cols-2" : ""}`}>
        {rule.components.map((c) => {
          const e = evals.find((x) => x.key === c.key);
          const prior = DEMO_HISTORY[rule.id][c.key];
          const d = dec(c, u);
          const format = (v: number) => u.fromCanonical(v).toFixed(d);
          const bands = getBands(c, form.contextId);
          const shownBands = e?.band ?? bands;
          return (
            <div key={c.key} className="min-w-0">
              <div className="mb-1 text-sm font-medium text-ink">
                {c.label} <span className="text-mute">({u.label})</span>
              </div>
              <div className="h-[190px]">
                <CheckerTrendChart
                  title={c.label}
                  prior={prior}
                  current={e ? e.value : null}
                  green={shownBands.green}
                  baseline={e?.baselineValue ?? null}
                  format={format}
                  labels={[...dayLabels(prior.length, yesterday), "Now"]}
                  state={result?.state}
                />
              </div>
              <TrendStats e={e} c={c} u={u} />
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function TrendStats({ e, c, u }: { e: ComponentEvaluation | undefined; c: ComponentRule; u: UnitOption }) {
  if (!e) return <p className="mt-2 text-sm text-mute">Run a check to analyse this reading against the history.</p>;
  const t = e.trend;
  const d = dec(c, u);
  const show = (v: number) => `${u.fromCanonical(v).toFixed(d)} ${u.label}`;
  const arrow = t.direction === "rising" ? "↗ Rising" : t.direction === "falling" ? "↘ Falling" : t.direction === "stable" ? "→ Stable" : "Insufficient data";
  const color = t.concern ? "text-neon-amber" : t.direction === "insufficient" ? "text-mute" : "text-neon-green";
  return (
    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
      <Stat label="Direction" value={arrow} cls={color} />
      <Stat
        label="Recent vs earlier"
        value={t.change === null ? `needs ${MIN_TREND_POINTS}+ days` : `${t.change >= 0 ? "+" : "−"}${Math.abs(u.fromCanonical(t.change) - u.fromCanonical(0)).toFixed(d)} ${u.label}`}
      />
      <Stat label="3-day average" value={t.recentMean === null ? "—" : show(t.recentMean)} />
      <Stat label="Days outside range" value={String(t.daysOutside)} cls={t.daysOutside >= 3 ? "text-neon-amber" : ""} />
    </dl>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <dt className="text-xs text-mute">{label}</dt>
      <dd className={`font-semibold text-ink ${cls}`}>{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------ rule table */

function RulesPanel({ checker, unit }: { checker: ParameterChecker; unit: UnitOption }) {
  const { rules, rule, form } = checker;
  const ctx = rule.contexts?.find((c) => c.id === form.contextId);

  const fmtV = (c: ComponentRule, v: number) => unit.fromCanonical(v).toFixed(dec(c, unit));
  const rows = rule.components.map((c) => {
    const b = getBands(c, form.contextId);
    const [gLo, gHi] = b.green;
    const hiRed = Number.isFinite(b.red.above);
    return {
      c,
      green: `${fmtV(c, gLo)}–${fmtV(c, gHi)}`,
      yellow: hiRed ? `${fmtV(c, b.red.below)}–${fmtV(c, gLo)} or ${fmtV(c, gHi)}–${fmtV(c, b.red.above)}` : `${fmtV(c, b.red.below)}–${fmtV(c, gLo)}`,
      red: hiRed ? `below ${fmtV(c, b.red.below)} or above ${fmtV(c, b.red.above)}` : `below ${fmtV(c, b.red.below)}`,
      baseline:
        c.baseline.mode === "pct"
          ? `±${c.baseline.yellowAt}%`
          : `±${(unit.fromCanonical(c.baseline.yellowAt) - unit.fromCanonical(0)).toFixed(dec(c, unit))} ${unit.label}`,
      trend: `${(unit.fromCanonical(c.trend.minChange) - unit.fromCanonical(0)).toFixed(dec(c, unit))} ${unit.label}`,
    };
  });

  return (
    <Panel className="p-4">
      <PanelHeader
        icon="database"
        title="Reference Rules"
        right={
          <span className="rounded-full border border-neon-amber/60 px-3 py-0.5 text-xs font-bold tracking-wide text-neon-amber">
            ILLUSTRATIVE
          </span>
        }
      />
      <p className="mt-2 text-xs text-mute">
        {rules.meta.label} · {rule.note}
        {ctx ? ` Showing: ${ctx.label}.` : ""}
      </p>

      <div className="mt-3 space-y-4">
        {rows.map((r) => (
          <table key={r.c.key} className="w-full text-sm">
            <caption className="mb-1 text-left font-medium text-ink">
              {r.c.label} ({unit.label})
            </caption>
            <tbody className="divide-y divide-line/30">
              <Row state="green" range={r.green} />
              <Row state="yellow" range={r.yellow} />
              <Row state="red" range={r.red} />
              <tr>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-mute">
                  Baseline flag
                </th>
                <td className="py-1.5 text-ink/90">beyond {r.baseline}</td>
              </tr>
              <tr>
                <th scope="row" className="py-1.5 pr-3 text-left font-normal text-mute">
                  Trend change
                </th>
                <td className="py-1.5 text-ink/90">≥ {r.trend} (needs {MIN_TREND_POINTS}+ prior days)</td>
              </tr>
            </tbody>
          </table>
        ))}
      </div>
      <p className="mt-3 text-xs leading-snug text-mute">
        Baseline and trend signals can raise GREEN to YELLOW but never to RED. UNAVAILABLE means the entry or measurement
        conditions could not be validated, so no classification is made.
      </p>
    </Panel>
  );
}

function Row({ state, range }: { state: "green" | "yellow" | "red"; range: string }) {
  const s = STATE_STYLE[state];
  return (
    <tr>
      <th scope="row" className="w-24 py-1.5 pr-3 text-left">
        <span className={`inline-flex items-center gap-1.5 font-semibold ${s.text}`}>
          <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden="true" />
          {s.label}
        </span>
      </th>
      <td className="py-1.5 text-ink/90">{range}</td>
    </tr>
  );
}
