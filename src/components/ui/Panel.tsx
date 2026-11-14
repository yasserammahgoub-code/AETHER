import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

export function Panel({ className = "", children }: { className?: string; children: ReactNode }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

interface HeaderProps {
  icon: IconName;
  title: string;
  iconClass?: string;
  right?: ReactNode;
}

export function PanelHeader({ icon, title, iconClass = "text-neon-blue", right }: HeaderProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon name={icon} className={`h-6 w-6 shrink-0 ${iconClass}`} />
        <h2 className="truncate text-lg font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {right}
    </div>
  );
}
