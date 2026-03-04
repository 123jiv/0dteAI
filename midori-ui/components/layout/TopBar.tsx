import { Search, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type TopBarProps = {
  title: string;
  marketStatus?: "open" | "after-hours" | "closed";
  clock?: string;
};

export function TopBar({
  title,
  marketStatus = "open",
  clock
}: TopBarProps) {
  const statusLabel =
    marketStatus === "open"
      ? "MARKET OPEN"
      : marketStatus === "after-hours"
      ? "AFTER HOURS"
      : "MARKET CLOSED";

  const statusClass =
    marketStatus === "open"
      ? "bg-green-dim border-green-border text-green"
      : marketStatus === "after-hours"
      ? "bg-yellow-dim border-yellow text-yellow"
      : "bg-muted2/40 border-border text-text2";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-[rgba(8,12,10,0.85)] px-6 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-lg font-semibold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
              statusClass
            )}
          >
            <span className="live-dot" />
            <span>{statusLabel}</span>
          </div>
          <div className="font-mono text-xs text-muted">
            {clock ?? "09:31:04 ET"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="border border-border/60 bg-surface/40"
          >
            <Search className="h-4 w-4 text-muted" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="border border-border/60 bg-surface/40"
          >
            <Bell className="h-4 w-4 text-muted" />
          </Button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface text-[11px] font-medium text-text2">
            JM
          </div>
        </div>
      </div>
    </header>
  );
}

