import {
  Activity,
  BarChart3,
  BrainCircuit,
  ChartCandlestick,
  Compass,
  Gauge,
  Grid3X3,
  Heatmap,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "TRADE",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Analysis", icon: BrainCircuit, href: "/analysis" },
      { label: "Signals", icon: Sparkles, href: "/signals" }
    ]
  },
  {
    label: "RESEARCH",
    items: [
      { label: "Screener", icon: Grid3X3, href: "/screener" },
      { label: "Backtest", icon: ChartCandlestick, href: "/backtest" },
      { label: "Confidence", icon: Gauge, href: "/confidence" }
    ]
  },
  {
    label: "MANAGE",
    items: [
      { label: "Risk Center", icon: ShieldCheck, href: "/risk" },
      { label: "Chat", icon: MessageCircle, href: "/chat" }
    ]
  },
  {
    label: "LEARN",
    items: [
      { label: "Academy", icon: Compass, href: "/academy" },
      { label: "Community", icon: Activity, href: "/community" },
      { label: "Methodology", icon: Heatmap, href: "/methodology" }
    ]
  }
];

type SidebarProps = {
  activePath?: string;
};

export function Sidebar({ activePath }: SidebarProps) {
  const router = useRouter();
  const currentPath = activePath ?? router.pathname;
  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-bg2/95">
      <div className="border-b border-border px-4 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-green-dim text-sm">
            <span className="text-green">🌿</span>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xs font-semibold tracking-tight">
              Project Midori
            </span>
            <span className="text-[10px] font-normal text-muted">
              Smarter, Safer Trading
            </span>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mt-3">
            <div className="px-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
              {group.label}
            </div>
            <div className="mt-1 space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentPath === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-[9px] px-3 py-2 text-sm text-muted transition-all duration-150 hover:bg-surface hover:text-white",
                      isActive &&
                        "border border-green-border bg-green-dim text-green"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 text-muted",
                        isActive && "text-green"
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="space-y-3 px-3 pb-4 pt-1">
        <div className="rounded-[12px] border border-border bg-surface p-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center">
              <svg
                viewBox="0 0 36 36"
                className="h-11 w-11 -rotate-90 text-muted"
              >
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  stroke="rgba(148, 163, 184, 0.25)"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  stroke="rgba(0,230,118,0.9)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="94.2"
                  strokeDashoffset="28.2"
                  fill="none"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-mono font-semibold text-green">
                72
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
                Account Health
              </span>
              <span className="text-xs font-medium text-green">Healthy</span>
              <span className="text-[10px] text-muted">
                Guardrails active today
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <span>Dark</span>
            <div className="relative h-4 w-7 cursor-pointer rounded-full bg-muted2">
              <div className="absolute left-[14px] top-[2px] h-3 w-3 rounded-full bg-green shadow-[0_0_0_3px_rgba(0,230,118,0.25)]" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-[10px] text-text2">
              JM
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

