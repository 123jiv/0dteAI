"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Feather, Library, LayoutDashboard, Moon, Sun, UserCircle2 } from "lucide-react";
import { useEffect } from "react";
import { usePrefs } from "@/lib/store";
import { supabaseEnabled } from "@/lib/supabase";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Create", icon: Feather },
  { href: "/library", label: "Library", icon: Library },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

export function Nav() {
  const pathname = usePathname();
  const { theme, setTheme } = usePrefs();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent-strong">
            <Feather size={15} />
          </span>
          StoryForge
        </Link>

        <nav className="flex items-center gap-1">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors",
                pathname === href ? "bg-glass text-fg" : "text-muted hover:text-fg"
              )}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="ml-1 rounded-full p-2 text-muted hover:bg-glass hover:text-fg cursor-pointer"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {supabaseEnabled() && (
            <Link
              href="/login"
              className="rounded-full p-2 text-muted hover:bg-glass hover:text-fg"
              aria-label="Account"
            >
              <UserCircle2 size={17} />
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
