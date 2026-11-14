import { getBands, getUnit } from "./checker/engine";
import type { ParameterRule } from "./checker/types";

export interface ReferenceRow {
  state: "green" | "yellow" | "red";
  /** One entry per component (two for blood pressure). */
  cells: string[];
}

export interface ReferenceTable {
  /** Component names; only worth showing when there is more than one. */
  columns: string[];
  rows: ReferenceRow[];
}

/** GREEN / YELLOW / RED bands of a parameter, in the chosen unit and context. */
export function referenceTable(rule: ParameterRule, unitId: string, contextId?: string): ReferenceTable {
  const unit = getUnit(rule, unitId);
  const rows: ReferenceRow[] = [
    { state: "green", cells: [] },
    { state: "yellow", cells: [] },
    { state: "red", cells: [] },
  ];

  for (const comp of rule.components) {
    const b = getBands(comp, contextId);
    const d = unit.decimals ?? comp.decimals;
    const f = (v: number) => unit.fromCanonical(v).toFixed(d);

    rows[0].cells.push(`${f(b.green[0])} – ${f(b.green[1])}`);

    const yellow: string[] = [];
    if (b.red.below < b.green[0]) yellow.push(`${f(b.red.below)} – ${f(b.green[0])}`);
    if (Number.isFinite(b.red.above) && b.green[1] < b.red.above) yellow.push(`${f(b.green[1])} – ${f(b.red.above)}`);
    rows[1].cells.push(yellow.join(" or ") || "—");

    const red = [`below ${f(b.red.below)}`];
    if (Number.isFinite(b.red.above)) red.push(`above ${f(b.red.above)}`);
    rows[2].cells.push(red.join(" or "));
  }

  return { columns: rule.components.map((c) => c.label), rows };
}
