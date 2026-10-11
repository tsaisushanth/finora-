"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Coins, HandCoins, PiggyBank, Scale } from "lucide-react";
import { formatPaise } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/shared/money";
import { AdjustBalanceDialog } from "@/components/wallet/adjust-balance-dialog";

export type WalletStats = {
  addedPaise: number;
  movedOutPaise: number;
  inGoalsPaise: number;
  lentOutstandingPaise: number;
  borrowedOutstandingPaise: number;
};

export function WalletOverview({
  balancePaise,
  stats,
}: {
  balancePaise: number;
  stats: WalletStats;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"add" | "remove" | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);

  const url = `${pathname}?${searchParams?.toString() ?? ""}`;

  if (url !== prevUrl) {
    setPrevUrl(url);
    if (searchParams?.get("new") === "topup") {
      setMode("add");
    }
  }

  const open = mode !== null;

  return (
    <>
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
        <CardHeader>
          <CardDescription>Available balance — derived from your ledger</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Money paise={balancePaise} className="text-3xl font-semibold" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => setMode("add")}>
                <ArrowDownToLine className="size-4" aria-hidden="true" />
                Add money
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMode("remove")}>
                <ArrowUpFromLine className="size-4" aria-hidden="true" />
                Remove money
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label="Money in"
          value={<Money paise={stats.addedPaise} tone="positive" />}
        />
        <StatCard
          icon={Scale}
          label="Moved out"
          value={<Money paise={stats.movedOutPaise} tone="negative" />}
        />
        <StatCard
          icon={PiggyBank}
          label="In goals"
          value={<Money paise={stats.inGoalsPaise} />}
        />
        <StatCard
          icon={HandCoins}
          label="Loans outstanding"
          value={
            <span className="tabular-nums">
              <Money paise={stats.lentOutstandingPaise + stats.borrowedOutstandingPaise} />
              {stats.lentOutstandingPaise > 0 ? (
                <span className="ml-1 text-xs text-muted-foreground">lent {formatPaise(stats.lentOutstandingPaise)}</span>
              ) : null}
              {stats.borrowedOutstandingPaise > 0 ? (
                <span className="ml-1 text-xs text-muted-foreground">
                  borrowed {formatPaise(stats.borrowedOutstandingPaise)}
                </span>
              ) : null}
            </span>
          }
        />
      </div>

      <AdjustBalanceDialog
        key={mode ?? "add"}
        open={open}
        defaultMode={mode ?? "add"}
        onOpenChange={(next) => {
          if (!next) setMode(null);
        }}
        onSaved={() => {
          setMode(null);
          router.refresh();
        }}
      />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Coins;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-base font-medium">{value}</p>
      </CardContent>
    </Card>
  );
}