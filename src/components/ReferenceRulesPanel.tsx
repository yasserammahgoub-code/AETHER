import type { ParameterChecker } from "../hooks/useParameterChecker";
import { referenceTable } from "../lib/referenceRules";
import { STATE_STYLE } from "./checker/state";
import { Icon } from "./ui/Icon";
import { Panel, PanelHeader } from "./ui/Panel";

/** GREEN / YELLOW / RED bands for the selected parameter (from the same rule set the checker uses). */
export function ReferenceRulesPanel({ checker }: { checker: ParameterChecker }) {
  const { rule, form } = checker;
  const unit = rule.units.find((u) => u.id === form.unitId) ?? rule.units[0];
  const { columns, rows } = referenceTable(rule, unit.id, form.contextId);
  const multi = columns.length > 1;
  const context = rule.contexts?.find((c) => c.id === form.contextId)?.label;

  return (
    <Panel className="flex flex-col p-4 sm:p-5">
      <PanelHeader icon="clipboard" title="Reference Rules" right={<span className="text-sm text-mute">{[unit.label, context].filter(Boolean).join(" · ")}</span>} />

      <div className="mt-3 flex flex-1 flex-col justify-center">
        <table className="w-full border-separate border-spacing-y-2 text-left">
          {multi && (
            <thead>
              <tr className="text-xs text-mute">
                <th scope="col" className="sr-only">
                  Status
                </th>
                {columns.map((c) => (
                  <th key={c} scope="col" className="pb-0.5 font-medium">
                    {c.replace(" pressure", "")}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((r) => {
              const s = STATE_STYLE[r.state];
              return (
                <tr key={r.state} className="text-[15px]">
                  <th scope="row" className="w-[40%] whitespace-nowrap pr-3 font-bold">
                    <span className="flex items-center gap-3">
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-space-950 ${s.bg}`} aria-hidden="true">
                        {r.state === "green" && <Icon name="check" className="h-4 w-4" strokeWidth={3.5} />}
                      </span>
                      <span className={s.text}>{s.label}</span>
                    </span>
                  </th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="text-ink">
                      {c}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
