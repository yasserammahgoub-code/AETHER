import { useEffect, useState } from "react";
import { getUnit, parseNumber } from "../../lib/checker/engine";
import { liveReadingFor, outOfRange, paramRule, rangeCheck } from "../../lib/emergency/engine";
import type { Measurement, Pathway, PathwayState } from "../../lib/emergency/types";
import type { LiveVitals } from "../../types";
import { STATE_STYLE } from "../checker/state";
import { Icon } from "../ui/Icon";
import { EmPanel, focusRing } from "./ui";

type ParamM = Extract<Measurement, { kind: "param" }>;
type ScaleM = Extract<Measurement, { kind: "scale" }>;
type ChoiceM = Extract<Measurement, { kind: "choice" }>;

const fieldBox = "rounded-xl border border-emg-line/40 bg-emg-950/60 p-3";

/**
 * One typed reading. The stored value is always in the parameter's canonical unit (what the range check and the
 * reports use). Parameters with alternate units (glucose, temperature) show a unit toggle and convert on entry.
 */
function ParamField({ m, value, live, onCommit }: { m: ParamM; value: string; live: LiveVitals; onCommit: (v: string) => void }) {
  const rule = paramRule(m.parameterId);
  const canon = rule.units[0];
  const canonDec = canon.decimals ?? rule.components[0].decimals;
  const [unitId, setUnitId] = useState(canon.id);
  const unit = getUnit(rule, unitId);
  const unitDec = unit.decimals ?? rule.components[0].decimals;

  const toDisplay = (stored: string) => {
    if (unit === canon) return stored;
    const n = parseNumber(stored);
    return n === null ? stored : unit.fromCanonical(n).toFixed(unitDec);
  };
  const toStored = (typed: string) => {
    const t = typed.trim();
    if (unit === canon) return t;
    const n = parseNumber(t);
    // Unparseable text is stored as typed so the range check can explain what is wrong with it.
    return n === null ? t : canon.fromCanonical(unit.toCanonical(n)).toFixed(canonDec);
  };

  const [draft, setDraft] = useState(() => toDisplay(value));
  useEffect(() => setDraft(toDisplay(value)), [value, unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (typed: string) => {
    const next = toStored(typed);
    if (next !== value) onCommit(next);
  };
  const result = rangeCheck(m.parameterId, value);
  const style = result ? STATE_STYLE[result.state] : null;
  const live_ = liveReadingFor(m.parameterId, live);
  const inputId = `emg-${m.id}`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={fieldBox}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={inputId} className="text-[15px] font-medium text-emg-ink">
          {rule.units.length > 1 ? rule.shortLabel : rule.label}
        </label>
        {rule.units.length > 1 && (
          <div role="group" aria-label={`${rule.shortLabel} unit`} className="flex gap-1">
            {rule.units.map((u) => (
              <button
                key={u.id}
                type="button"
                aria-pressed={u.id === unitId}
                onClick={() => {
                  commit(draft); // keep what was typed, in the unit it was typed in
                  setUnitId(u.id);
                }}
                className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${focusRing} ${
                  u.id === unitId ? "border-white/70 bg-emg-700 text-white" : "border-emg-line/50 text-emg-ink hover:bg-emg-800"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={inputId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && commit(draft)}
          inputMode={m.parameterId === "bp" ? "text" : "decimal"}
          autoComplete="off"
          placeholder={unit === canon ? rule.placeholder : unit.fromCanonical(Number(rule.defaultBaseline)).toFixed(unitDec)}
          aria-describedby={hintId}
          className={`min-w-0 flex-1 rounded-lg border border-emg-line/60 bg-emg-900 px-3 py-2.5 text-lg font-semibold text-emg-ink placeholder:text-emg-mute/50 ${focusRing}`}
        />
        {live_ !== null && (
          <button
            type="button"
            onClick={() => {
              setDraft(toDisplay(live_));
              onCommit(live_);
            }}
            className={`shrink-0 rounded-lg border border-neon-cyan/60 bg-cyan-950/50 px-3 text-sm font-medium text-cyan-100 hover:bg-cyan-900/50 ${focusRing}`}
            title={`Fill in the latest simulated telemetry: ${live_} ${rule.unit}`}
          >
            Use live reading
          </button>
        )}
      </div>
      <p id={hintId} className="mt-1.5 text-xs leading-snug text-emg-mute">
        {m.why}
        {unit !== canon && parseNumber(value) !== null && ` Recorded and reported as ${value} ${rule.unit}.`}
      </p>
      {result && style && (
        <div className={`mt-2 flex items-start gap-2 rounded-lg border bg-black/25 px-2.5 py-1.5 text-sm ${style.border}`}>
          <Icon name={style.icon} className={`mt-0.5 h-4 w-4 shrink-0 ${style.text}`} strokeWidth={2.4} />
          <span className="text-emg-ink">
            <strong className={style.text}>{style.label}</strong>
            {result.state === "unavailable"
              ? `: ${result.problems[0]?.message ?? "reading could not be checked"}`
              : outOfRange(result).length
                ? `: ${outOfRange(result).join(", ")}`
                : ": inside the reference range"}
          </span>
        </div>
      )}
    </div>
  );
}

function ScaleField({ m, value, onChange }: { m: ScaleM; value: string; onChange: (v: string) => void }) {
  return (
    <div className={fieldBox} role="radiogroup" aria-label={m.label}>
      <div className="text-[15px] font-medium text-emg-ink">{m.label}</div>
      <div className="mt-2 grid grid-cols-11 gap-1">
        {Array.from({ length: 11 }, (_, i) => {
          const on = value === String(i);
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? "" : String(i))}
              className={`rounded-md border py-2 text-sm font-semibold ${focusRing} ${
                on ? "border-white/70 bg-neon-red text-white" : "border-emg-line/50 bg-emg-900 text-emg-ink hover:bg-emg-800"
              }`}
            >
              {i}
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-xs text-emg-mute">
        <span>{m.lowLabel}</span>
        <span>{m.highLabel}</span>
      </div>
      <p className="mt-1.5 text-xs leading-snug text-emg-mute">{m.why}</p>
    </div>
  );
}

function ChoiceField({ m, value, onChange }: { m: ChoiceM; value: string; onChange: (v: string) => void }) {
  return (
    <div className={fieldBox} role="radiogroup" aria-label={m.label}>
      <div className="text-[15px] font-medium text-emg-ink">{m.label}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {m.options.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? "" : o.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${focusRing} ${
                on ? "border-white/70 bg-neon-red text-white" : "border-emg-line/50 bg-emg-900 text-emg-ink hover:bg-emg-800"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-xs leading-snug text-emg-mute">{m.why}</p>
    </div>
  );
}

interface Props {
  pathway: Pathway;
  state: PathwayState | undefined;
  live: LiveVitals;
  onValue: (mid: string, value: string) => void;
}

/**
 * The pathway's own measurements, grouped for the narrow first column: typed readings, the 0 to 10 severity scale,
 * and the timing / context questions. Nothing is added or dropped; the grouping is by measurement kind.
 */
export function Measurements({ pathway, state, live, onValue }: Props) {
  const render = (m: Measurement) => {
    const value = state?.values[m.id] ?? "";
    const set = (v: string) => onValue(m.id, v);
    switch (m.kind) {
      case "param":
        return <ParamField key={m.id} m={m} value={value} live={live} onCommit={set} />;
      case "scale":
        return <ScaleField key={m.id} m={m} value={value} onChange={set} />;
      case "choice":
        return <ChoiceField key={m.id} m={m} value={value} onChange={set} />;
    }
  };
  const params = pathway.measurements.filter((m) => m.kind === "param");
  const scales = pathway.measurements.filter((m) => m.kind === "scale");
  const choices = pathway.measurements.filter((m) => m.kind === "choice");

  return (
    <>
      {params.length > 0 && (
        <EmPanel title="Health measurements" icon="activity" tone="blue">
          <p className="mb-3 text-sm leading-relaxed text-emg-mute">
            Type a reading or use the latest one from AETHER. Skip anything you cannot measure. Range checks use illustrative reference
            ranges and are not a diagnosis.
          </p>
          <div className="flex flex-col gap-3">{params.map(render)}</div>
        </EmPanel>
      )}
      {scales.length > 0 && (
        <EmPanel title="Symptom severity" icon="sliders" tone="blue">
          <div className="flex flex-col gap-3">{scales.map(render)}</div>
        </EmPanel>
      )}
      {choices.length > 0 && (
        <EmPanel title="Symptom timing and details" icon="clock" tone="blue">
          <div className="flex flex-col gap-3">{choices.map(render)}</div>
        </EmPanel>
      )}
    </>
  );
}
