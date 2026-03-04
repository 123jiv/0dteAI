"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutDashboard, Sparkles, ShieldCheck, MessageCircle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/signals", icon: Sparkles, label: "Signals" },
  { href: "/risk", icon: ShieldCheck, label: "Risk" },
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/academy", icon: MoreHorizontal, label: "More" }
];

export function BottomNav() {
  const router = useRouter();
  const path = router.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 items-center justify-around border-t border-border bg-bg2 md:hidden">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = path === item.href || (item.href === "/academy" && path !== "/dashboard" && path !== "/signals" && path !== "/risk" && path !== "/chat");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 text-[10px] transition-colors",
              isActive ? "text-green" : "text-muted"
            )}
          >
            <Icon className={cn("h-5 w-5", isActive && "text-green")} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
