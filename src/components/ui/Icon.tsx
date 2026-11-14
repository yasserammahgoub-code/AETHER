import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V11z" />,
  sliders: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  chart: <path d="M4 20V11M10 20V4M16 20v-7M22 20H2" />,
  alert: <path d="M12 3l10 18H2L12 3zM12 10v5M12 18h.01" />,
  calendarCheck: (
    <>
      <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" />
      <path d="M9 15.5l2 2 4-4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="8" ry="3" />
      <path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
    </>
  ),
  heart: <path d="M12 21s-8-5.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.5-8 11-8 11z" />,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  lungs: (
    <path d="M12 3v8M12 11c0-2-2-3-4-1-2 2-4 6-4 9 0 1.5 1 2 2.5 2S9 20 9 18v-7M12 11c0-2 2-3 4-1 2 2 4 6 4 9 0 1.5-1 2-2.5 2S15 20 15 18v-7" />
  ),
  thermo: (
    <>
      <path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0V4z" />
      <path d="M12 9v8" />
    </>
  ),
  bulb: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />,
  bed: <path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5M7 11.5h.01" />,
  trophy: <path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 21h8M10 17h4" />,
  shield: (
    <>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" />
      <path d="M12 8v6M9 11h6" />
    </>
  ),
  cloud: <path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9H7z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  bell: <path d="M6 16v-5a6 6 0 1 1 12 0v5l2 2H4l2-2zM10 21h4" />,
  calendar: <path d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17.5h2M11 17.5h2" />,
  check: <path d="M5 12.5l5 5 9-10" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  star: <path d="M12 3l2.7 5.8 6.3.8-4.6 4.4 1.2 6.3L12 17.2l-5.6 3.1 1.2-6.3L3 9.6l6.3-.8L12 3z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5h.01" />
    </>
  ),
  arrowRight: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowLeft: <path d="M20 12H5M11 6l-6 6 6 6" />,
  brain: (
    <path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 3 3 2 2 0 0 0 3-1.5V5.5A2 2 0 0 0 9 4zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-3 3 2 2 0 0 1-3-1.5V5.5A2 2 0 0 1 15 4z" />
  ),
  mind: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 14.5c1 1.5 2.2 2 3.5 2s2.5-.5 3.5-2M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  orbit: (
    <>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-30 12 12)" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.5a3 3 0 0 1 0 5.5M18 14.5c1.8.8 3 2.5 3 5.5" />
    </>
  ),
  radio: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
    </>
  ),
  clipboard: <path d="M9 4h6v3H9zM7 5.5H5v16h14v-16h-2M8.5 13l2.5 2.5 4.5-5" />,
  list: <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />,
  download: <path d="M12 4v11M7 11l5 5 5-5M4 20h16" />,
  send: <path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z" />,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
};

export type IconName = keyof typeof ICONS;

interface Props {
  name: IconName;
  className?: string;
  filled?: boolean;
  strokeWidth?: number;
}

export function Icon({ name, className = "h-5 w-5", filled = false, strokeWidth = 1.8 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
