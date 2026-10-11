"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  ChevronRight,
  CircleDollarSign,
  HandCoins,
  PiggyBank,
  ScanLine,
  Sparkles,
  Target,
  Wallet2,
} from "lucide-react";
import { Cell, Pie, PieChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPaise, formatPaiseCompact, numericToPaise } from "@/lib/money";
import { formatDateTimeInTimeZone } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/money";
import type { InsightsData } from "@/lib/insights/queries";
import type { GoalItem } from "@/lib/goals/queries";
import type { TransactionItem, WalletStats } from "@/lib/transactions/queries";

const spendConfig: ChartConfig = {
  spend: { label: "Spend", color: "var(--chart-1)" },
};

function moneyValue(value: number | string): string {
  return formatPaise(Math.round(Number(value)));
}

function chartTooltipFormatter(value: unknown, name: unknown) {
  const key = String(name ?? "value");
  const label = spendConfig[key]?.label ?? key;
  return (
    <div className="flex w-full items-center justify-between gap-4 leading-none">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-foreground">
        {moneyValue(Number(value ?? 0))}
      </span>
    </div>
  );
}

function percent(part: number, whole: number): number | null {
  return whole > 0 ? Math.round((part / whole) * 100) : null;
}

function deltaPercent(current: number, previous: number): number | null {
  return previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
}

function fallbackTitle(item: TransactionItem): string {
  return item.title ?? (item.kind === "income" ? "Money added" : "Expense");
}

function Tile({
  icon: Icon,
  label,
  value,
  foot,
  tone,
  href,
}: {
  icon: typeof Wallet2;
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
  tone?: "positive" | "negative";
  href?: string;
}) {
  const iconClass =
    tone === "positive"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : tone === "negative"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";

  const body = (
    <Card className="h-full transition-colors hover:border-primary/50 hover:bg-accent/40">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <span className={`grid size-9 place-items-center rounded-lg ${iconClass}`}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {href ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" /> : null}
      </CardHeader>
      <CardContent className="grid gap-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p>{value}</p>
        {foot ? <p className="text-xs text-muted-foreground">{foot}</p> : null}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href} prefetch={false}>{body}</Link> : body;
}

export function DashboardView({
  firstName,
  timezone,
  data,
  summary,
  recent,
  goals,
  monthGoalContribPaise,
}: {
  firstName: string | null;
  timezone: string;
  data: InsightsData;
  summary: { balancePaise: number; stats: WalletStats };
  recent: TransactionItem[];
  goals: GoalItem[];
  monthGoalContribPaise: number;
}) {
  const { stats } = summary;
  const netWorthPaise =
    summary.balancePaise + stats.inGoalsPaise + (stats.lentOutstandingPaise - stats.borrowedOutstandingPaise);

  const delta = deltaPercent(data.spendPaise, data.prevMonthSpendPaise);
  const budgetPercent = percent(data.spendPaise, data.budgetPaise);
  const top = data.topCategories[0] ?? null;

  const featuredGoal =
    [...goals].sort((a, b) => b.progress - a.progress).find((goal) => goal.savedPaise > 0) ??
    goals[0] ??
    null;

  const notes: React.ReactNode[] = [];

  if (data.spendPaise > 0) {
    notes.push(
      top
        ? `${top.name} is your biggest spend this month — ${Math.round(top.share * 100)}% of the total (${formatPaise(top.spendPaise)}).`
        : "Spending is spread fairly evenly across categories this month.",
    );
    if (delta !== null) {
      notes.push(
        `You spent ${delta > 0 ? `${delta}% more` : `${Math.abs(delta)}% less`} than last month${delta < 0 ? " — nice." : "."}`,
      );
    }
    if (budgetPercent !== null) {
      notes.push(
        `You've used ${budgetPercent}% of your monthly budget this month${budgetPercent >= 100 ? " — you're over budget." : "."}`,
      );
    }
  }
  if (data.spendPaise === 0) {
    notes.push("No spending yet this month — log your first expense to kick things off.");
  }
  if (monthGoalContribPaise > 0) {
    notes.push(`${formatPaise(monthGoalContribPaise)} moved into goals this month. Nice pace.`);
  }
  if (featuredGoal && featuredGoal.requiredMonthlyPaise !== null) {
    notes.push(
      `Setting aside ${formatPaise(featuredGoal.requiredMonthlyPaise)} a month would get you to "${featuredGoal.name}" right on time.`,
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
        <CardHeader>
          <CardTitle className="text-xl">
            Welcome back{firstName ? `, ${firstName}` : ""}
          </CardTitle>
          <CardDescription>
            Here&apos;s your money at a glance — balance, spending and goals for {data.currentMonthLabel}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs text-muted-foreground">Available balance</p>
              <Money paise={summary.balancePaise} className="text-4xl font-bold tracking-tight" />
            </div>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PiggyBank className="size-3.5" aria-hidden="true" /> In goals
                </dt>
                <dd className="text-sm font-semibold tabular-nums">
                  <Money paise={stats.inGoalsPaise} />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <HandCoins className="size-3.5" aria-hidden="true" /> To receive
                </dt>
                <dd className="text-sm font-semibold tabular-nums">
                  <Money paise={stats.lentOutstandingPaise} tone="positive" />
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Wallet2 className="size-3.5" aria-hidden="true" /> Net worth
                </dt>
                <dd className="text-sm font-semibold tabular-nums">
                  <Money paise={netWorthPaise} />
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" render={<Link href="/transactions?new=expense" prefetch={false} />}>
              <ArrowUpFromLine className="size-4" aria-hidden="true" /> Log expense
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/wallet" prefetch={false} />}>
              <ArrowDownToLine className="size-4" aria-hidden="true" /> Add money
            </Button>
            <Button size="sm" variant="outline" render={<Link href="/bills/scan" prefetch={false} />}>
              <ScanLine className="size-4" aria-hidden="true" /> Scan a bill
            </Button>
          </div>
        </CardContent>
      </Card>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Quick summary">
        <Tile
          icon={CircleDollarSign}
          label="Budget used"
          value={
            budgetPercent !== null ? (
              <span className="text-lg font-semibold tabular-nums">{budgetPercent}%</span>
            ) : (
              "—"
            )
          }
          foot={data.budgetPaise > 0 ? `of ${formatPaise(data.budgetPaise)}` : "No budget set"}
        />
        <Tile
          icon={HandCoins}
          label="To receive"
          value={
            <Money paise={stats.lentOutstandingPaise} tone="positive" className="text-lg font-semibold" />
          }
          foot="Money lent out"
          href="/loans"
        />
        <Tile
          icon={ArrowLeftRight}
          label="To pay"
          value={
            <Money paise={stats.borrowedOutstandingPaise} tone="negative" className="text-lg font-semibold" />
          }
          foot="Money borrowed"
          href="/loans"
        />
        <Tile
          icon={PiggyBank}
          label="Set aside this month"
          tone={data.savingsPaise < 0 ? "negative" : "positive"}
          value={<Money paise={data.savingsPaise} className="text-lg font-semibold" />}
          foot="Income − spend"
          href="/insights"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Daily spend — {data.currentMonthLabel}</CardTitle>
            <CardDescription>How your daily expenses have added up so far.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.dailyTrend.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending to plot yet this month.
              </p>
            ) : (
              <ChartContainer config={spendConfig} className="aspect-auto h-48 w-full">
                <BarChart data={data.dailyTrend} accessibilityLayer>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={20}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={44}
                    tickFormatter={(value) => formatPaiseCompact(Number(value))}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={chartTooltipFormatter} />}
                  />
                  <Bar dataKey="spendPaise" fill="var(--color-spend)" radius={3} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription>Where this month&apos;s {formatPaise(data.spendPaise)} went.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No spending recorded yet this month — the donut fills up as expenses come in.
              </p>
            ) : (
              <div className="grid items-center gap-4 sm:grid-cols-2 sm:gap-6">
                <ChartContainer config={{}} className="mx-auto aspect-square h-48 w-full max-w-48 sm:max-w-none">
                  <PieChart>
                    <Pie
                      data={data.topCategories}
                      dataKey="spendPaise"
                      nameKey="name"
                      innerRadius={44}
                      outerRadius={70}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.topCategories.map((slice) => (
                        <Cell key={slice.id ?? "other"} fill={slice.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent formatter={chartTooltipFormatter} />} />
                  </PieChart>
                </ChartContainer>
                <ul className="grid gap-1.5">
                  {data.topCategories.map((slice) => (
                    <li key={slice.id ?? "other"} className="flex items-center gap-2 text-sm">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: slice.color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(slice.share * 100)}%
                      </span>
                      <Money paise={slice.spendPaise} className="w-20 text-right" />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent transactions</CardTitle>
              <CardDescription>Your latest activity across the ledger.</CardDescription>
            </div>
            {recent.length > 0 ? (
              <Link
                href="/transactions"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View all
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transactions yet.{" "}
                <Link href="/transactions?new=expense" className="text-primary underline-offset-4 hover:underline">
                  Log your first expense
                </Link>
                .
              </p>
            ) : (
              <ul className="grid gap-1">
                {recent.map((item) => {
                  const paise = numericToPaise(item.amount);
                  const Icon = item.kind === "income" ? ArrowDownToLine : ArrowUpFromLine;
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      <Link
                        href="/transactions"
                        className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-2 transition-colors hover:bg-accent/50"
                      >
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {fallbackTitle(item)}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDateTimeInTimeZone(item.occurredAt, timezone)}
                          </span>
                        </span>
                        <Money
                          paise={paise}
                          tone={item.kind === "income" ? "positive" : "default"}
                          className="text-sm font-semibold"
                        />
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Goals</CardTitle>
              <CardDescription>Saved toward targets, straight from your wallet.</CardDescription>
            </div>
            {goals.length > 0 ? (
              <Link
                href="/goals"
                className="text-sm text-primary underline-offset-4 hover:underline"
              >
                View all
              </Link>
            ) : null}
          </CardHeader>
          <CardContent>
            {!featuredGoal ? (
              <p className="text-sm text-muted-foreground">
                No goals yet.{" "}
                <Link href="/goals?new=goal" className="text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>{" "}
                to start plotting progress here.
              </p>
            ) : (
              <div className="grid gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Target className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{featuredGoal.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {featuredGoal.progress}% funded
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
                    <Money paise={featuredGoal.savedPaise} className="text-foreground" /> /{" "}
                    <Money paise={featuredGoal.targetPaise} tone="muted" />
                  </span>
                </div>
                <Progress value={featuredGoal.progress} />
                <p className="text-xs text-muted-foreground">
                  {monthGoalContribPaise > 0
                    ? `${formatPaise(monthGoalContribPaise)} moved into goals this month.`
                    : "No money moved into goals this month."}
                  {featuredGoal.requiredMonthlyPaise !== null
                    ? ` ${formatPaise(featuredGoal.requiredMonthlyPaise)}/month keeps you on pace.`
                    : ""}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {notes.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Notes for you
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2.5">
              {notes.slice(0, 3).map((note, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-sm"
                >
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}