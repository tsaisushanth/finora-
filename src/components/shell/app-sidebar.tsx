"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { mainNav, scanNav, settingsNav, type NavItem } from "@/lib/nav";
import { Brand } from "@/components/brand";
import { Separator } from "@/components/ui/separator";

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const active =
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {item.title}
    </Link>
  );
}

export function AppSidebar() {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <Brand className="px-2 pt-1" />
      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
        <Separator className="my-2" />
        <NavLink item={scanNav} />
      </nav>
      <NavLink item={settingsNav} />
    </div>
  );
}