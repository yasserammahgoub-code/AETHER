import { NAV_ITEMS, type NavId } from "../data/demo";
import { Icon } from "./ui/Icon";

interface Props {
  active: NavId;
  onSelect: (id: NavId) => void;
  emergencyActive?: boolean;
}

export function Sidebar({ active, onSelect, emergencyActive = false }: Props) {
  return (
    <aside className="panel flex min-w-0 flex-col overflow-hidden rounded-2xl p-2.5 lg:min-h-[640px]">
      <nav aria-label="Primary" className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const danger = "danger" in item && item.danger;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex shrink-0 items-center gap-3.5 rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70",
                danger
                  ? "border-neon-red/70 bg-red-950/40 text-red-100 shadow-[0_0_16px_rgba(255,60,60,0.25)] hover:bg-red-900/40"
                  : isActive
                    ? "border-blue-400/70 bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.55)]"
                    : "border-transparent text-ink/90 hover:border-line/70 hover:bg-space-700/40",
              ].join(" ")}
            >
              <Icon
                name={item.icon}
                className={`h-6 w-6 shrink-0 ${danger ? "text-neon-red" : isActive ? "text-white" : "text-neon-blue"}`}
              />
              <span className="whitespace-nowrap leading-tight">{item.label}</span>
              {danger && emergencyActive && (
                <span className="ml-auto rounded bg-neon-red px-1.5 py-0.5 text-[10px] font-bold text-white">ACTIVE</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Earth + tagline (desktop only) */}
      <div className="relative mt-4 hidden flex-1 overflow-hidden rounded-xl lg:block">
        <div className="earth absolute -bottom-[210px] -left-[170px] h-[460px] w-[460px] overflow-hidden rounded-full">
          <div className="absolute left-[34%] top-[8%] h-10 w-44 rotate-[-18deg] rounded-full bg-white/25 blur-md" />
          <div className="absolute left-[44%] top-[20%] h-8 w-36 rotate-[12deg] rounded-full bg-white/20 blur-md" />
          <div className="absolute left-[56%] top-[30%] h-6 w-28 rotate-[-8deg] rounded-full bg-white/15 blur-md" />
        </div>
        <div className="relative z-10 flex h-full flex-col justify-end gap-3 px-3 pb-3">
          <p className="text-lg italic leading-snug text-ink/95">
            Healthy Astronaut.
            <br />
            Successful Mission.
          </p>
          <div className="grid h-14 w-14 place-items-center rounded-full border border-blue-300/50 bg-blue-950/70 text-center text-[8px] font-bold leading-[1.1] tracking-wider text-blue-100 shadow-[0_0_14px_rgba(60,140,255,0.5)]">
            SPACE
            <br />
            APPS
          </div>
        </div>
      </div>
    </aside>
  );
}
