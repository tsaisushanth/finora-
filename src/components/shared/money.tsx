import { formatPaise } from "@/lib/money";

export function Money({
  paise,
  tone = "default",
  className,
}: {
  paise: number;
  tone?: "default" | "positive" | "negative" | "muted";
  className?: string;
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "text-destructive"
        : tone === "muted"
          ? "text-muted-foreground"
          : "";
  return (
    <span className={`tabular-nums ${toneClass} ${className ?? ""}`.trim()}>
      {formatPaise(paise)}
    </span>
  );
}