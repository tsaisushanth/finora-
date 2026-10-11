"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight, HandCoins, Scale, UserCheck } from "lucide-react";
import { formatDateInTimeZone } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { LoanLinks } from "@/components/loans/loan-links";
import { LoanFormDialog } from "@/components/loans/loan-form-dialog";
import { RepayLoanDialog } from "@/components/loans/repay-loan-dialog";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/shared/money";
import type { LoanItem } from "@/lib/loans/queries";

export function LoansView({
  loans,
  timezone,
}: {
  loans: LoanItem[];
  timezone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [loanFormOpen, setLoanFormOpen] = useState(false);
  const [repaying, setRepaying] = useState<LoanItem | null>(null);

  const url = `${pathname}?${searchParams?.toString() ?? ""}`;

  if (url !== prevUrl) {
    setPrevUrl(url);
    if (searchParams?.get("new") === "loan") setLoanFormOpen(true);
  }

  const lentOutstanding = loans
    .filter((loan) => loan.direction === "lent")
    .reduce((sum, loan) => sum + loan.outstandingPaise, 0);
  const borrowedOutstanding = loans
    .filter((loan) => loan.direction === "borrowed")
    .reduce((sum, loan) => sum + loan.outstandingPaise, 0);
  const net = lentOutstanding - borrowedOutstanding;

  const openLoans = loans.filter((loan) => loan.outstandingPaise > 0);
  const settledLoans = loans.filter((loan) => loan.outstandingPaise === 0);

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={ArrowUpRight}
          label="You lent"
          value={<Money paise={lentOutstanding} className="text-base font-medium" />}
        />
        <StatCard
          icon={ArrowDownLeft}
          label="You borrowed"
          value={<Money paise={borrowedOutstanding} tone="negative" className="text-base font-medium" />}
        />
        <StatCard
          icon={Scale}
          label="Net"
          value={
            <span className="text-base font-medium tabular-nums">
              {net > 0 ? `Owed to you ${formatPaise(net)}` : net < 0 ? `You owe ${formatPaise(Math.abs(net))}` : "Even steven"}
            </span>
          }
          tone={net > 0 ? "positive" : net < 0 ? "negative" : "neutral"}
        />
      </div>

      {loans.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="No loans yet"
          description="Lend or borrow from friends with partial repayments tracked against each loan."
          action={<LoanLinks />}
        />
      ) : (
        <div className="grid gap-5">
          {openLoans.length > 0 ? (
            <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
              {openLoans.map((loan) => (
                <li key={loan.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                      loan.direction === "lent"
                        ? "bg-primary/10 text-primary"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {loan.direction === "lent" ? (
                      <ArrowUpRight className="size-5" aria-hidden="true" />
                    ) : (
                      <ArrowDownLeft className="size-5" aria-hidden="true" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium">
                      <span className="truncate">{loan.person}</span>
                      <Badge variant="outline">{loan.direction === "lent" ? "Lent" : "Borrowed"}</Badge>
                      {loan.status === "partially_repaid" ? (
                        <Badge variant="secondary">Partially repaid</Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDateInTimeZone(loan.occurredAt, timezone)}
                      {loan.dueDate ? ` · due ${formatDateInTimeZone(loan.dueDate, timezone)}` : ""}
                    </p>
                    {loan.note ? (
                      <p className="truncate text-xs text-muted-foreground/80">{loan.note}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-0.5 text-right">
                    <Money paise={loan.outstandingPaise} tone={loan.direction === "lent" ? "default" : "negative"} className="text-sm font-medium" />
                    <p className="text-xs text-muted-foreground">
                      of {formatPaise(loan.principalPaise)}
                      {loan.repaidPaise > 0 ? ` · repaid ${formatPaise(loan.repaidPaise)}` : ""}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant={loan.direction === "lent" ? "outline" : "default"}
                    onClick={() => setRepaying(loan)}
                  >
                    {loan.direction === "lent" ? "Add repayment" : "Repay"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}

          {settledLoans.length > 0 ? (
            <div className="grid gap-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Settled
              </h2>
              <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
                {settledLoans.map((loan) => (
                  <li key={loan.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                      <UserCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-medium">
                        <span className="truncate">{loan.person}</span>
                        <Badge variant="outline">{loan.direction === "lent" ? "Lent" : "Borrowed"}</Badge>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateInTimeZone(loan.occurredAt, timezone)}
                        {loan.dueDate ? ` · due ${formatDateInTimeZone(loan.dueDate, timezone)}` : ""}
                      </p>
                    </div>
                    <Money paise={0} tone="muted" className="text-sm" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      <LoanFormDialog
        key={loanFormOpen ? "open" : "closed"}
        open={loanFormOpen}
        onOpenChange={setLoanFormOpen}
        timezone={timezone}
        onSaved={() => {
          setLoanFormOpen(false);
          router.refresh();
        }}
      />

      <RepayLoanDialog
        key={repaying ? repaying.id : "closed"}
        loan={repaying}
        open={repaying !== null}
        onOpenChange={(next) => {
          if (!next) setRepaying(null);
        }}
        timezone={timezone}
        onSaved={() => {
          setRepaying(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ArrowUpRight;
  label: string;
  value: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
}) {
  const iconClass =
    tone === "positive"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <span className={`grid size-9 place-items-center rounded-lg ${iconClass}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value}</p>
      </CardContent>
    </Card>
  );
}