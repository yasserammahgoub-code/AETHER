import { useId, useState, type PointerEvent } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import type { TrendSeries } from "../../types";

interface Props {
  series: TrendSeries;
  data: number[];
  labels: string[];
}

const PAD_T = 10;
const PAD_B = 6;
const PAD_R = 8;

/**
 * Dependency-free SVG chart (line / area / bar) with hover crosshair + tooltip.
 * Rendered at true pixel size so text never distorts.
 */
export function TrendChart({ series, data, labels }: Props) {
  const [ref, { w, h }] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const uid = useId().replace(/:/g, "");

  const { min, max, ticks, color, kind } = series;
  const tickText = (v: number) => (series.tickLabel ? series.tickLabel(v) : String(v));
  const maxLabel = Math.max(...ticks.map((t) => tickText(t).length));
  const padL = 12 + maxLabel * 6.4;

  const n = data.length;
  const iw = Math.max(0, w - padL - PAD_R);
  const ih = Math.max(0, h - PAD_T - PAD_B);
  const inset = kind === "bar" ? 0 : 10;

  const xAt = (i: number) =>
    kind === "bar" ? padL + ((i + 0.5) * iw) / n : padL + inset + (n === 1 ? iw / 2 : (i * (iw - inset * 2)) / (n - 1));
  const yAt = (v: number) => PAD_T + ih - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * ih;

  const linePts = data.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
  const linePath = `M${linePts.join(" L")}`;
  const areaPath = n ? `${linePath} L${xAt(n - 1).toFixed(1)},${PAD_T + ih} L${xAt(0).toFixed(1)},${PAD_T + ih} Z` : "";
  const barW = Math.min((iw / n) * 0.62, 24);

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left + padL;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i++) {
      const d = Math.abs(xAt(i) - px);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHover(best);
  };

  const hx = hover !== null ? xAt(hover) : 0;
  const hy = hover !== null ? yAt(data[hover]) : 0;
  const tipLeft = Math.min(Math.max(hx, 44), Math.max(44, w - 44));

  return (
    <div ref={ref} className="relative h-full min-h-[110px] w-full touch-pan-y select-none">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible" role="img" aria-label={`${series.title} over the last ${n} days`}>
          <defs>
            <linearGradient id={`g${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.4" />
              <stop offset="1" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* grid + y labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={padL} x2={w - PAD_R} y1={yAt(t)} y2={yAt(t)} stroke="#6f8fd0" strokeOpacity="0.22" strokeDasharray="2 4" />
              <text x={padL - 8} y={yAt(t)} textAnchor="end" dominantBaseline="central" fontSize="11.5" fill="#a9bbe0">
                {tickText(t)}
              </text>
            </g>
          ))}
          <line x1={padL} x2={padL} y1={PAD_T} y2={PAD_T + ih} stroke="#6f8fd0" strokeOpacity="0.4" />
          <line x1={padL} x2={w - PAD_R} y1={PAD_T + ih} y2={PAD_T + ih} stroke="#6f8fd0" strokeOpacity="0.4" />

          {/* series (re-keyed on data change so the draw animation replays) */}
          <g key={`${n}-${kind}`}>
            {kind === "area" && <path d={areaPath} fill={`url(#g${uid})`} className="chart-fade" />}
            {kind !== "bar" && (
              <>
                <path
                  d={linePath}
                  fill="none"
                  stroke={color}
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  pathLength={1}
                  className="chart-line"
                  style={{ filter: `drop-shadow(0 0 4px ${color}aa)` }}
                />
                {data.map((v, i) => (
                  <circle key={i} cx={xAt(i)} cy={yAt(v)} r={hover === i ? 5 : 3.2} fill={color} stroke="#061230" strokeWidth="1.2" className="chart-fade" />
                ))}
              </>
            )}
            {kind === "bar" &&
              data.map((v, i) => {
                const top = yAt(v);
                const active = hover === i;
                return (
                  <rect
                    key={i}
                    x={xAt(i) - barW / 2}
                    y={top}
                    width={barW}
                    height={Math.max(0, PAD_T + ih - top)}
                    rx="2"
                    fill={color}
                    fillOpacity={active ? 1 : 0.85}
                    className="chart-bar"
                    style={{ animationDelay: `${i * 25}ms`, filter: active ? `drop-shadow(0 0 6px ${color})` : undefined }}
                  />
                );
              })}
          </g>

          {/* hover affordances */}
          {hover !== null && kind !== "bar" && (
            <line x1={hx} x2={hx} y1={PAD_T} y2={PAD_T + ih} stroke={color} strokeOpacity="0.55" strokeDasharray="3 3" />
          )}

          {/* pointer capture layer */}
          <rect
            x={padL}
            y={0}
            width={iw}
            height={h}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}

      {hover !== null && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-blue-400/50 bg-space-950/95 px-2 py-1 text-xs shadow-[0_0_14px_rgba(40,120,255,0.4)]"
          style={{ left: tipLeft, top: Math.max(0, hy - 46) }}
        >
          <div className="text-mute">{labels[hover]}</div>
          <div className="font-semibold" style={{ color }}>
            {series.format(data[hover])}
            {series.unit && series.id !== "bp" ? ` ${series.unit}` : series.id === "bp" ? " mmHg" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
