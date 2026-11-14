import { useState, type PointerEvent } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import type { CheckState } from "../../lib/checker/types";

interface Props {
  title: string;
  prior: number[];
  current: number | null;
  /** Reference green band. */
  green: [number, number];
  baseline: number | null;
  /** Format a canonical value for display (already unit-converted). */
  format: (v: number) => string;
  labels: string[];
  state?: CheckState;
  color?: string;
}

const PAD_T = 12;
const PAD_B = 22;
const PAD_R = 10;
const STATE_COLOR: Record<CheckState, string> = { green: "#22e07a", yellow: "#facc15", red: "#ff3b3b", unavailable: "#8fa8d4" };

/** History line + green reference band + baseline marker + the entry being checked. */
export function CheckerTrendChart({ title, prior, current, green, baseline, format, labels, state, color = "#38bdf8" }: Props) {
  const [ref, { w, h }] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const data = current === null ? prior : [...prior, current];
  const n = data.length;
  const finiteGreen = green.filter(Number.isFinite);
  const all = [...data, ...finiteGreen, ...(baseline !== null ? [baseline] : [])];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = (hi - lo || 1) * 0.15;
  lo -= pad;
  hi += pad;

  const padL = 46;
  const iw = Math.max(0, w - padL - PAD_R);
  const ih = Math.max(0, h - PAD_T - PAD_B);
  const xAt = (i: number) => padL + 8 + (n <= 1 ? iw / 2 : (i * (iw - 16)) / (n - 1));
  const yAt = (v: number) => PAD_T + ih - ((v - lo) / (hi - lo)) * ih;
  const bandTop = yAt(Math.min(hi, green[1]));
  const bandBot = yAt(Math.max(lo, green[0]));

  const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
  const priorPath = prior.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const curColor = state ? STATE_COLOR[state] : color;

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + padL;
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i) - px);
      if (d < bd) [bd, best] = [d, i];
    }
    setHover(best);
  };

  const summary = `${title}: ${prior.length} prior days${current !== null ? ` and the current entry ${format(current)}` : ""}. Green range ${format(green[0])} to ${format(green[1])}.`;

  return (
    <div ref={ref} className="relative h-full min-h-[150px] w-full touch-pan-y select-none">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible" role="img" aria-label={summary}>
          {Number.isFinite(bandTop) && bandBot > bandTop && (
            <rect x={padL} y={bandTop} width={iw} height={bandBot - bandTop} fill="#22e07a" fillOpacity="0.1" stroke="#22e07a" strokeOpacity="0.3" strokeDasharray="3 4" />
          )}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={w - PAD_R} y1={yAt(t)} y2={yAt(t)} stroke="#6f8fd0" strokeOpacity="0.18" strokeDasharray="2 4" />
              <text x={padL - 8} y={yAt(t)} textAnchor="end" dominantBaseline="central" fontSize="11.5" fill="#a9bbe0">
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={padL} x2={padL} y1={PAD_T} y2={PAD_T + ih} stroke="#6f8fd0" strokeOpacity="0.4" />
          <line x1={padL} x2={w - PAD_R} y1={PAD_T + ih} y2={PAD_T + ih} stroke="#6f8fd0" strokeOpacity="0.4" />

          {baseline !== null && (
            <g>
              <line x1={padL} x2={w - PAD_R} y1={yAt(baseline)} y2={yAt(baseline)} stroke="#facc15" strokeOpacity="0.8" strokeDasharray="6 4" />
              <text x={w - PAD_R - 2} y={yAt(baseline) - 4} textAnchor="end" fontSize="11" fill="#facc15">
                baseline
              </text>
            </g>
          )}

          <path d={priorPath} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }} />
          {prior.map((v, i) => (
            <circle key={i} cx={xAt(i)} cy={yAt(v)} r={hover === i ? 5 : 3.2} fill={color} stroke="#061230" strokeWidth="1.2" />
          ))}

          {current !== null && n > 1 && (
            <>
              <line x1={xAt(n - 2)} y1={yAt(prior[prior.length - 1])} x2={xAt(n - 1)} y2={yAt(current)} stroke={curColor} strokeWidth="2" strokeDasharray="4 3" />
              <circle cx={xAt(n - 1)} cy={yAt(current)} r={hover === n - 1 ? 7.5 : 6} fill={curColor} stroke="#061230" strokeWidth="1.5" style={{ filter: `drop-shadow(0 0 6px ${curColor})` }} />
            </>
          )}

          {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
            <text key={i} x={xAt(i)} y={h - 5} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} fontSize="11" fill="#a9bbe0">
              {labels[i]}
            </text>
          ))}

          {hover !== null && <line x1={xAt(hover)} x2={xAt(hover)} y1={PAD_T} y2={PAD_T + ih} stroke={color} strokeOpacity="0.55" strokeDasharray="3 3" />}
          <rect x={padL} y={0} width={iw} height={h} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}

      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-blue-400/50 bg-space-950/95 px-2 py-1 text-xs shadow-[0_0_14px_rgba(40,120,255,0.4)]"
          style={{ left: Math.min(Math.max(xAt(hover), 44), Math.max(44, w - 44)), top: Math.max(0, yAt(data[hover]) - 46) }}
        >
          <div className="text-mute">{labels[hover]}</div>
          <div className="font-semibold" style={{ color: hover === n - 1 && current !== null ? curColor : color }}>
            {format(data[hover])}
          </div>
        </div>
      )}
    </div>
  );
}
