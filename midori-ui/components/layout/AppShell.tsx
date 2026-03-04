import { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

type AppShellProps = {
  children: ReactNode;
  title: string;
};

export function AppShell({ children, title }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      <div className="bg-grid" />
      <div className="bg-glow" />
      <div className="hidden md:block md:w-56 md:shrink-0">
        <Sidebar />
      </div>
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        <TopBar title={title} />
        <main className="relative z-10 flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

