import { useId, useState, type PointerEvent } from "react";
import { useElementSize } from "../../hooks/useElementSize";
import type { CheckState } from "../../lib/checker/types";
import { formatPointTime, type TrendSeries } from "../../lib/trends";

const LINE_COLORS = ["#22d3ee", "#60a5fa"];
const STATE_COLOR: Record<CheckState, string> = { green: "#22e07a", yellow: "#facc15", red: "#ff3b3b", unavailable: "#8fa8d4" };

const M = { l: 64, r: 28, t: 16, b: 36 };

interface Props {
  title: string;
  series: TrendSeries;
}

/** Large cyan trend graph: dashed grid, labelled axes, recorded points, hover/tap tooltip. */
export function HealthTrendChart({ title, series }: Props) {
  const [ref, { w, h }] = useElementSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId();

  const { lines, xMin, xMax, yMin, yMax, yTicks, xTicks, decimals, unitLabel, daily } = series;
  const iw = Math.max(0, w - M.l - M.r);
  const ih = Math.max(0, h - M.t - M.b);
  const xAt = (t: number) => M.l + (xMax === xMin ? iw / 2 : ((t - xMin) / (xMax - xMin)) * iw);
  const yAt = (v: number) => M.t + ih - ((v - yMin) / (yMax - yMin)) * ih;
  const fmt = (v: number) => v.toFixed(decimals);

  const main = lines[0].points;
  const pathOf = (pts: { t: number; v: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${xAt(p.t).toFixed(1)},${yAt(p.v).toFixed(1)}`).join(" ");
  const areaPath = main.length
    ? `${pathOf(main)} L${xAt(main[main.length - 1].t).toFixed(1)},${(M.t + ih).toFixed(1)} L${xAt(main[0].t).toFixed(1)},${(M.t + ih).toFixed(1)} Z`
    : "";

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left + M.l;
    let best = 0;
    let bd = Infinity;
    main.forEach((p, i) => {
      const d = Math.abs(xAt(p.t) - px);
      if (d < bd) [bd, best] = [d, i];
    });
    setHover(best);
  };

  const last = main[main.length - 1];
  const summary = `${title} graph, ${main.length} readings. Latest ${lines.map((l) => `${l.label} ${fmt(l.points[l.points.length - 1].v)}`).join(", ")} ${unitLabel}.`;

  return (
    <div ref={ref} className="relative h-full min-h-[240px] w-full touch-pan-y select-none">
      {lines.length > 1 && (
        <ul className="absolute right-6 top-0 z-10 flex gap-4 text-xs text-ink/90">
          {lines.map((l, i) => (
            <li key={l.key} className="flex items-center gap-1.5">
              <span className="h-2 w-4 rounded-full" style={{ background: LINE_COLORS[i] }} aria-hidden="true" />
              {l.label}
            </li>
          ))}
        </ul>
      )}

      {w > 0 && h > 0 && (
        <svg width={w} height={h} className="absolute inset-0 overflow-visible" role="img" aria-label={summary}>
          <defs>
            <linearGradient id={`${gid}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#14b8a6" stopOpacity="0.45" />
              <stop offset="1" stopColor="#0f766e" stopOpacity="0.06" />
            </linearGradient>
          </defs>

          {yTicks.map((t) => (
            <g key={t}>
              <line x1={M.l} x2={w - M.r} y1={yAt(t)} y2={yAt(t)} stroke="#6f8fd0" strokeOpacity="0.28" strokeDasharray="4 5" />
              <text x={M.l - 12} y={yAt(t)} textAnchor="end" dominantBaseline="central" fontSize="14" fill="#e8f0ff">
                {fmt(t)}
              </text>
            </g>
          ))}
          {xTicks.map((t) => (
            <g key={t.t}>
              <line x1={xAt(t.t)} x2={xAt(t.t)} y1={M.t} y2={M.t + ih} stroke="#6f8fd0" strokeOpacity="0.2" strokeDasharray="4 5" />
              <line x1={xAt(t.t)} x2={xAt(t.t)} y1={M.t + ih} y2={M.t + ih + 5} stroke="#a9bbe0" strokeOpacity="0.7" />
              <text
                x={xAt(t.t)}
                y={h - 8}
                textAnchor={t.t === xTicks[0].t ? "start" : t.t === xTicks[xTicks.length - 1].t ? "end" : "middle"}
                fontSize="13"
                fill="#e8f0ff"
              >
                {t.label}
              </text>
            </g>
          ))}
          <line x1={M.l} x2={M.l} y1={M.t} y2={M.t + ih} stroke="#a9bbe0" strokeOpacity="0.7" />
          <line x1={M.l} x2={w - M.r} y1={M.t + ih} y2={M.t + ih} stroke="#a9bbe0" strokeOpacity="0.7" />
          <text transform={`translate(14 ${M.t + ih / 2}) rotate(-90)`} textAnchor="middle" fontSize="12" fill="#8fa8d4">
            {unitLabel}
          </text>

          {areaPath && <path d={areaPath} fill={`url(#${gid}-fill)`} />}

          {lines.map((l, li) => (
            <g key={l.key}>
              <path
                d={pathOf(l.points)}
                fill="none"
                stroke={LINE_COLORS[li]}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 5px ${LINE_COLORS[li]}99)` }}
              />
              {l.points.map((p, i) =>
                p.source === "check" ? (
                  <circle key={i} cx={xAt(p.t)} cy={yAt(p.v)} r={hover === i ? 8 : 6.5} fill={STATE_COLOR[p.state ?? "unavailable"]} stroke="#061230" strokeWidth="2" />
                ) : (
                  <circle key={i} cx={xAt(p.t)} cy={yAt(p.v)} r={hover === i ? 6 : 4.5} fill={LINE_COLORS[li]} stroke="#061230" strokeWidth="1.2" />
                ),
              )}
            </g>
          ))}

          {hover !== null && main[hover] && (
            <line x1={xAt(main[hover].t)} x2={xAt(main[hover].t)} y1={M.t} y2={M.t + ih} stroke="#22d3ee" strokeOpacity="0.6" strokeDasharray="3 3" />
          )}
          <rect x={M.l} y={0} width={iw} height={h} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)} />
        </svg>
      )}

      {hover !== null && main[hover] && w > 0 && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-blue-400/50 bg-space-950/95 px-2.5 py-1.5 text-xs shadow-[0_0_14px_rgba(40,120,255,0.4)]"
          style={{
            left: Math.min(Math.max(xAt(main[hover].t), 70), Math.max(70, w - 70)),
            top: Math.max(0, yAt(Math.max(...lines.map((l) => l.points[hover].v))) - 56),
          }}
        >
          <div className="text-mute">
            {formatPointTime(main[hover].t, daily)}
            {main[hover].source === "check" && <span className="ml-1.5 font-semibold text-ink">· Your check</span>}
            {main[hover].source === "live" && <span className="ml-1.5 font-semibold text-ink">· Live</span>}
          </div>
          {lines.map((l, i) => (
            <div key={l.key} className="font-semibold" style={{ color: LINE_COLORS[i] }}>
              {lines.length > 1 && `${l.label}: `}
              {fmt(l.points[hover].v)} {unitLabel}
            </div>
          ))}
        </div>
      )}
      {!hover && last && <span className="sr-only">Latest reading {fmt(last.v)} {unitLabel}</span>}
    </div>
  );
}
