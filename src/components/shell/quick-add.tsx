"use client";

import Link from "next/link";
import { createContext, useContext, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { quickAddItems } from "@/lib/nav";

type QuickAddContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const QuickAddContext = createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext);
  if (!ctx) {
    throw new Error("useQuickAdd must be used within <QuickAddProvider>");
  }
  return ctx;
}

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <QuickAddContext.Provider value={{ open, setOpen }}>
      {children}
      <QuickAddSheet />
    </QuickAddContext.Provider>
  );
}

function QuickAddSheet() {
  const { open, setOpen } = useQuickAdd();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="bottom" showCloseButton={true}>
        <SheetHeader>
          <SheetTitle>Add something</SheetTitle>
          <SheetDescription>
            Choose what you want to record. Forms land in the next phases.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-2">
          {quickAddItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}