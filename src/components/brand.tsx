import Link from "next/link";
import { Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { appName } from "@/lib/nav";

export function Brand({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
      aria-label={`${appName} home`}
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Wallet className="size-4" aria-hidden="true" />
      </span>
      {showName && (
        <span className="font-heading text-lg font-semibold tracking-tight">
          {appName}
        </span>
      )}
    </Link>
  );
}