"use client";

import { Plus } from "lucide-react";
import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { useQuickAdd } from "@/components/shell/quick-add";

export function TopBar() {
  const { setOpen } = useQuickAdd();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="flex-1" />
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden md:inline-flex"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add
      </Button>
      <ThemeToggle />
    </header>
  );
}