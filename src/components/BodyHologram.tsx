import type { VitalKey } from "../types";

/** Anchor points on the body (viewBox coordinates 240 x 440). */
export const BODY_MARKERS: { key: VitalKey; x: number; y: number }[] = [
  { key: "hr", x: 120, y: 44 },
  { key: "bp", x: 112, y: 128 },
  { key: "spo2", x: 120, y: 200 },
  { key: "temp", x: 138, y: 318 },
];

export const BODY_VIEW = { w: 240, h: 440 };

const HALF_PATH =
  "M120,76 L131,77 C146,80 160,83 169,92 C178,100 181,114 183,130 L187,174 L195,226 L198,238 " +
  "C201,250 199,263 192,263 C185,263 183,253 183,246 L178,230 L169,178 L162,138 " +
  "C160,160 158,176 154,192 C151,206 155,218 157,232 C160,262 156,292 152,318 " +
  "C149,342 149,376 145,410 L147,424 C151,430 151,435 141,435 L126,435 C124,435 124,429 124,424 " +
  "L125,400 C125,372 124,342 124,318 C123,290 122,266 120,244 Z";

const MIRROR = "translate(240 0) scale(-1 1)";

interface Props {
  activeKey: VitalKey | null;
  onHover: (key: VitalKey | null) => void;
}

export function BodyHologram({ activeKey, onHover }: Props) {
  const ribYs = [98, 108, 118, 128, 138, 148];
  const joints: [number, number][] = [
    [171, 96], [185, 172], [194, 230], [153, 228], [138, 318], [145, 410],
  ];

  return (
    <div className="relative h-full w-full">
      <svg viewBox={`0 0 ${BODY_VIEW.w} ${BODY_VIEW.h}`} className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label="Holographic human body with vital-sign sensor points">
        <defs>
          <linearGradient id="bodyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#38bdf8" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#2563eb" stopOpacity="0.3" />
            <stop offset="1" stopColor="#1d4ed8" stopOpacity="0.14" />
          </linearGradient>
          <radialGradient id="heartGlow">
            <stop offset="0" stopColor="#ff4d4d" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#ff3030" stopOpacity="0.4" />
            <stop offset="1" stopColor="#ff3030" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#7dd3fc" stopOpacity="0" />
            <stop offset="0.5" stopColor="#bae6fd" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7dd3fc" stopOpacity="0" />
          </linearGradient>
          <pattern id="scanLines" width="240" height="5" patternUnits="userSpaceOnUse">
            <rect width="240" height="1" fill="#9be0ff" fillOpacity="0.2" />
          </pattern>
          <path id="halfBody" d={HALF_PATH} />
          <g id="ribHalf" fill="none" stroke="#9be0ff" strokeOpacity="0.55" strokeWidth="1.3">
            {ribYs.map((y) => (
              <path key={y} d={`M122,${y} C140,${y - 3} 152,${y + 3} 155,${y + 16}`} />
            ))}
          </g>
          <clipPath id="bodyClip">
            <ellipse cx="120" cy="38" rx="20" ry="25" />
            <rect x="110" y="58" width="20" height="24" />
            <use href="#halfBody" />
            <use href="#halfBody" transform={MIRROR} />
          </clipPath>
        </defs>

        {/* floor rings */}
        <ellipse cx="120" cy="436" rx="70" ry="9" fill="none" stroke="#38bdf8" strokeOpacity="0.5" />
        <ellipse cx="120" cy="436" rx="95" ry="13" fill="none" stroke="#38bdf8" strokeOpacity="0.25" />

        {/* silhouette */}
        <g className="holo-glow" fill="url(#bodyFill)" stroke="#4cc9ff" strokeWidth="1.6" strokeLinejoin="round">
          <ellipse cx="120" cy="38" rx="20" ry="25" />
          <rect x="110" y="58" width="20" height="24" stroke="none" />
          <use href="#halfBody" />
          <use href="#halfBody" transform={MIRROR} />
        </g>

        {/* interior anatomy, clipped to silhouette */}
        <g clipPath="url(#bodyClip)">
          <rect width="240" height="440" fill="url(#scanLines)" />

          {/* skull + brain */}
          <ellipse cx="120" cy="32" rx="12" ry="10" fill="none" stroke="#7dd3fc" strokeOpacity="0.7" />
          <circle cx="113" cy="42" r="3" fill="none" stroke="#9be0ff" strokeOpacity="0.6" />
          <circle cx="127" cy="42" r="3" fill="none" stroke="#9be0ff" strokeOpacity="0.6" />
          <path d="M112,52 h16" stroke="#9be0ff" strokeOpacity="0.5" />

          {/* spine */}
          <line x1="120" y1="64" x2="120" y2="236" stroke="#bae6fd" strokeOpacity="0.8" strokeWidth="3" strokeDasharray="3 5" />
          <line x1="104" y1="92" x2="136" y2="92" stroke="#9be0ff" strokeOpacity="0.6" />

          {/* ribcage + lungs */}
          <use href="#ribHalf" />
          <use href="#ribHalf" transform={MIRROR} />
          <ellipse cx="98" cy="122" rx="13" ry="24" fill="#38bdf8" fillOpacity="0.1" stroke="#7dd3fc" strokeOpacity="0.45" />
          <ellipse cx="142" cy="122" rx="13" ry="24" fill="#38bdf8" fillOpacity="0.1" stroke="#7dd3fc" strokeOpacity="0.45" />

          {/* pelvis */}
          <path d="M94,214 Q120,238 146,214 L144,238 Q120,256 96,238 Z" fill="none" stroke="#9be0ff" strokeOpacity="0.6" />

          {/* limb bones */}
          <g stroke="#9be0ff" strokeOpacity="0.45" strokeWidth="2" strokeLinecap="round">
            <path d="M172,98 L186,174 L194,228" fill="none" />
            <path d="M68,98 L54,174 L46,228" fill="none" />
            <path d="M140,236 L138,318 L135,410" fill="none" />
            <path d="M100,236 L102,318 L105,410" fill="none" />
          </g>
          {joints.map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="4.5" fill="none" stroke="#bae6fd" strokeOpacity="0.8" />
              <circle cx={240 - x} cy={y} r="4.5" fill="none" stroke="#bae6fd" strokeOpacity="0.8" />
            </g>
          ))}

          {/* heart */}
          <circle cx="110" cy="128" r="22" fill="url(#heartGlow)" />
          <path
            className="heart-beat"
            d="M110,142 C97,133 95,121 101,117 C105,114 110,117 110,121 C110,117 115,114 119,117 C125,121 123,133 110,142z"
            fill="#ff3d3d"
            stroke="#ffb4b4"
            strokeOpacity="0.7"
          />

          {/* scan sweep */}
          <rect className="scanline" x="0" y="0" width="240" height="26" fill="url(#scanGrad)" />
        </g>
      </svg>

      {/* connector stubs: marker -> right edge of body box */}
      <svg viewBox={`0 0 ${BODY_VIEW.w} ${BODY_VIEW.h}`} preserveAspectRatio="none" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible sm:block" aria-hidden="true">
        {BODY_MARKERS.map((m) => (
          <line
            key={m.key}
            x1={m.x}
            y1={m.y}
            x2={BODY_VIEW.w}
            y2={m.y}
            stroke="#38bdf8"
            strokeWidth="1.3"
            strokeOpacity={activeKey === m.key ? 1 : 0.55}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/* interactive markers */}
      {BODY_MARKERS.map((m) => {
        const active = activeKey === m.key;
        return (
          <button
            key={m.key}
            type="button"
            aria-label={`Highlight ${m.key} sensor`}
            onMouseEnter={() => onHover(m.key)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(m.key)}
            onBlur={() => onHover(null)}
            className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus:outline-none"
            style={{ left: `${(m.x / BODY_VIEW.w) * 100}%`, top: `${(m.y / BODY_VIEW.h) * 100}%` }}
          >
            {active && <span className="marker-ping absolute h-4 w-4 rounded-full bg-neon-cyan/60" />}
            <span
              className={`relative block rounded-full border-2 bg-space-950/80 transition-all ${
                active
                  ? "h-4 w-4 border-neon-cyan shadow-[0_0_14px_#22d3ee]"
                  : "h-3.5 w-3.5 border-sky-200 shadow-[0_0_8px_#7dd3fc]"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
