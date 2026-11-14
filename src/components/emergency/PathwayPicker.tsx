import type { ProtocolSet, PathwayId } from "../../lib/emergency/types";
import { Icon } from "../ui/Icon";
import { EmPanel, focusRing } from "./ui";

interface Props {
  protocols: ProtocolSet;
  /** The category chosen earlier in this session, if any. */
  selected: PathwayId | null;
  active: boolean;
  onSelect: (id: PathwayId) => void;
}

export function PathwayPicker({ protocols, selected, active, onSelect }: Props) {
  return (
    <EmPanel title="Emergency categories" icon="clipboard" className="flex-1">
      <p className="mb-3 max-w-3xl text-[15px] leading-relaxed text-emg-mute">
        Choose the area that best matches what is happening. If you are not sure, or it is getting worse, request crew assistance now.
        {!active && " Choosing a category also starts Emergency Mode manually."}
      </p>
      <div role="group" aria-label="Emergency categories" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {protocols.order.map((id) => {
          const p = protocols.pathways[id];
          const on = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              aria-pressed={on}
              className={`emg-cat group flex min-h-[128px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 text-center ${focusRing} ${
                on
                  ? "border-white bg-neon-red/25 shadow-[0_0_28px_rgba(255,59,59,0.65)] ring-2 ring-white/70"
                  : "border-neon-red/45 bg-red-950/40 hover:border-neon-red hover:bg-red-900/40 hover:shadow-[0_0_22px_rgba(255,59,59,0.4)]"
              }`}
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-full border ${
                  on ? "border-white bg-neon-red text-white" : "border-neon-red/60 bg-neon-red/15 text-neon-red"
                }`}
              >
                <Icon name={p.icon} className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <span className="text-[17px] font-bold leading-snug text-white">{p.title}</span>
              <span className="text-sm leading-snug text-emg-mute">{p.short}</span>
              {on && <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-red-800">LAST SELECTED</span>}
            </button>
          );
        })}
      </div>
    </EmPanel>
  );
}
