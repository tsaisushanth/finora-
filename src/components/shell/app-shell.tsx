"use client";

import type { ReactNode } from "react";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { BottomNav } from "@/components/shell/bottom-nav";
import { QuickAddProvider } from "@/components/shell/quick-add";
import { TopBar } from "@/components/shell/top-bar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <QuickAddProvider>
      <div className="min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar md:block">
          <AppSidebar />
        </aside>
        <div className="md:pl-64">
          <TopBar />
          <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-6 md:pb-14">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </QuickAddProvider>
  );
}