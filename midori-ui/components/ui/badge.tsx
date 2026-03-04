import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "success" | "warning" | "danger";
}

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  const base =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wide uppercase";

  const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
    default: "bg-surface text-text2 border border-border",
    outline: "bg-transparent text-muted border border-border",
    success:
      "bg-[rgba(0,230,118,0.16)] text-green border border-[rgba(0,230,118,0.4)]",
    warning:
      "bg-yellow-dim text-yellow border border-[rgba(255,193,7,0.5)]",
    danger: "bg-red-dim text-red border border-[rgba(255,77,77,0.5)]"
  };

  return (
    <div className={cn(base, variants[variant], className)} {...props} />
  );
}

