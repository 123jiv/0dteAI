"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type SignalCardProps = {
  ticker: string;
  direction: "bullish" | "bearish";
  mode?: "0DTE" | "Swing" | "Long-Term";
  conviction: number;
  strike?: string;
  expiry?: string;
  entry?: string;
  target?: string;
  stop?: string;
  regime?: string;
  compatible?: boolean;
  histProb?: string;
  reasoning?: string;
};

export function SignalCard({
  ticker,
  direction,
  mode = "0DTE",
  conviction,
  strike,
  expiry,
  entry,
  target,
  stop,
  regime,
  compatible = true,
  histProb = "67%",
  reasoning
}: SignalCardProps) {
  const borderColor =
    conviction >= 70
      ? "border-l-green"
      : conviction >= 50
      ? "border-l-yellow-400"
      : "border-l-red-400";

  const barColor =
    conviction >= 70
      ? "bg-green"
      : conviction >= 50
      ? "bg-yellow-400"
      : "bg-red-400";

  return (
    <Card
      className={cn(
        "border-l-[3px] rounded-[14px] p-5 transition-all duration-200 hover:border-border-hover hover:bg-surface-hover",
        borderColor
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="font-mono text-xs">
            {ticker}
          </Badge>
          <Badge
            variant={direction === "bullish" ? "success" : "danger"}
          >
            {direction === "bullish" ? "▲ Bullish" : "▼ Bearish"}
          </Badge>
          <Badge variant="outline">{mode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 rounded-full bg-border overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", barColor)}
              style={{ width: `${conviction}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted">{conviction}%</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-3">
        {[
          { label: "Strike", value: strike },
          { label: "Expiry", value: expiry },
          { label: "Entry", value: entry },
          { label: "Target", value: target },
          { label: "Stop", value: stop }
        ].map(({ label, value }) => (
          <div key={label}>
            <div className="text-[10px] font-medium uppercase tracking-widest text-muted">
              {label}
            </div>
            <div className="font-mono text-sm font-medium text-text mt-0.5">
              {value ?? "—"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        {regime && (
          <Badge variant="outline" className="text-[10px]">
            {regime}
          </Badge>
        )}
        <span className="text-xs text-text2">
          {compatible ? (
            <span className="text-green">✅ Compatible</span>
          ) : (
            <span className="text-yellow-400">⚠️ Check regime</span>
          )}
        </span>
        <span className="font-mono text-xs text-muted">
          {histProb} hist. prob
        </span>
      </div>

      {reasoning && (
        <Accordion type="single" collapsible className="mt-4">
          <AccordionItem value="reasoning" className="border-none">
            <AccordionTrigger className="text-[10px] uppercase tracking-widest text-muted py-0 hover:no-underline">
              How Midori decided this
            </AccordionTrigger>
            <AccordionContent className="text-sm text-text2 leading-relaxed">
              {reasoning}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}
    </Card>
  );
}
