"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChartPie, MoreHorizontal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  mainNav,
  scanNav,
  settingsNav,
  type NavItem,
} from "@/lib/nav";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQuickAdd } from "@/components/shell/quick-add";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function bottomItemFor(
  item: NavItem,
  pathname: string,
): { item: NavItem; active: boolean } {
  return { item, active: isActive(pathname, item.href) };
}

const moreSheetItems = [
  ...mainNav.filter((n) => n.href !== "/" && n.href !== "/wallet"),
  scanNav,
  settingsNav,
];

export function BottomNav() {
  const pathname = usePathname();
  const { setOpen } = useQuickAdd();
  const [moreOpen, setMoreOpen] = useState(false);

  const primary = [
    mainNav[0], // Home
    mainNav[1], // Wallet
  ];

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-5 items-center border-t bg-background/95 backdrop-blur-md md:hidden"
      >
        {primary.map((item) => {
          const { item: nav, active } = bottomItemFor(item, pathname);
          const Icon = nav.icon;
          return (
            <Link
              key={nav.href}
              href={nav.href}
              aria-current={active ? "page" : undefined}
              className="flex flex-col items-center gap-1 text-[0.7rem] font-medium text-muted-foreground"
            >
              <Icon
                className={cn("size-5", active && "text-primary")}
                aria-hidden="true"
              />
              {nav.title}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Add"
          className="grid place-items-center"
        >
          <span className="grid size-12 -mt-6 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Plus className="size-6" aria-hidden="true" />
          </span>
        </button>

        <Link
          href="/insights"
          aria-current={isActive(pathname, "/insights") ? "page" : undefined}
          className="flex flex-col items-center gap-1 text-[0.7rem] font-medium text-muted-foreground"
        >
          <ChartPie
            className={cn(
              "size-5",
              isActive(pathname, "/insights") && "text-primary",
            )}
            aria-hidden="true"
          />
          Insights
        </Link>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-col items-center gap-1 text-[0.7rem] font-medium text-muted-foreground"
        >
          <MoreHorizontal className="size-5" aria-hidden="true" />
          More
        </button>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
            <SheetDescription>Everything else in Finora.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-1">
            {moreSheetItems.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground hover:bg-accent/60",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {item.title}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}