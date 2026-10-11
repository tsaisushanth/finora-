"use client";

import { ArrowDownToLine, ArrowUpFromLine, PiggyBank, ReceiptText, TrendingUp } from "lucide-react";
import { formatDateTimeInTimeZone } from "@/lib/dates";
import { numericToPaise } from "@/lib/money";
import { EmptyState } from "@/components/empty-state";
import { Money } from "@/components/shared/money";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

export type WalletLedgerEntry = {
  id: string;
  type: string;
  amount: number;
  note: string | null;
  occurredAt: string;
};

const TYPE_META: Record<string, { label: string; icon: typeof PiggyBank; sign: 1 | -1; tone: "positive" | "negative" }> = {
  topup: { label: "Money added", icon: ArrowDownToLine, sign: 1, tone: "positive" },
  withdrawal: { label: "Money removed", icon: ArrowUpFromLine, sign: -1, tone: "negative" },
  expense: { label: "Expense", icon: ReceiptText, sign: -1, tone: "negative" },
  income: { label: "Income", icon: TrendingUp, sign: 1, tone: "positive" },
};

export function WalletLedger({
  entries,
  total,
  page,
  pageCount,
  timezone,
}: {
  entries: WalletLedgerEntry[];
  total: number;
  page: number;
  pageCount: number;
  timezone: string;
}) {
  function pageUrl(targetPage: number): string {
    return `/wallet?page=${targetPage}`;
  }

  return (
    <section className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">Ledger</h2>
        <p className="text-sm text-muted-foreground">
          {total} entry{total === 1 ? "" : "s"}
        </p>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="No ledger entries yet"
          description="Every expense, income, and wallet adjustment will show up here."
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {entries.map((entry) => {
            const meta = TYPE_META[entry.type] ?? { label: entry.type, icon: PiggyBank, sign: 1, tone: "positive" as const };
            const Icon = meta.icon;
            return (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                    meta.tone === "positive"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{meta.label}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTimeInTimeZone(entry.occurredAt, timezone)}
                    {entry.note ? ` · ${entry.note}` : ""}
                  </p>
                </div>
                <Money
                  paise={meta.sign * numericToPaise(entry.amount)}
                  tone={meta.tone}
                  className="text-sm"
                />
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            {page > 1 ? (
              <PaginationItem>
                <PaginationPrevious href={pageUrl(page - 1)} />
              </PaginationItem>
            ) : null}
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
            </PaginationItem>
            {page < pageCount ? (
              <PaginationItem>
                <PaginationNext href={pageUrl(page + 1)} />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}
    </section>
  );
}