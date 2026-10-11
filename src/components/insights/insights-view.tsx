"use client";

import Link from "next/link";
import {
  ChartPie,
  Coins,
  PiggyBank,
  Scale,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet2,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatPaise, formatPaiseCompact } from "@/lib/money";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Money } from "@/components/shared/money";
import { EmptyState } from "@/components/empty-state";
import type { InsightsData } from "@/lib/insights/queries";
import type { GoalItem } from "@/lib/goals/queries";

const trendConfig: ChartConfig = {
  spend: { label: "Spend", color: "var(--chart-1)" },
  income: { label: "Income", color: "var(--chart-2)" },
};

function moneyValue(value: number | string): string {
  return formatPaise(Math.round(Number(value)));
}

function chartTooltipFormatter(value: unknown, name: unknown) {
  const key = String(name ?? "value");
  const label = trendConfig[key]?.label ?? key;
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

export function InsightsView({
  data,
  goals,
  monthGoalContribPaise,
}: {
  data: InsightsData;
  goals: GoalItem[];
  monthGoalContribPaise: number;
}) {
  const hasData =
    data.spendPaise > 0 ||
    data.incomePaise > 0 ||
    data.prevMonthSpendPaise > 0 ||
    goals.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={ChartPie}
        title="Nothing to analyse yet"
        description="Once you log expenses and income, this page shows your trends, category splits and plain-language insights."
        action={
          <Button
            size="sm"
            render={
              <Link href="/transactions?new=expense" prefetch={false} />
            }
          >
            Log your first expense
          </Button>
        }
      />
    );
  }

  const delta = deltaPercent(data.spendPaise, data.prevMonthSpendPaise);
  const budgetPercent = percent(data.spendPaise, data.budgetPaise);
  const savingsPercent = percent(data.savingsPaise, data.incomePaise);
  const top = data.topCategories[0] ?? null;

  const featuredGoal = [...goals]
    .sort((a, b) => b.progress - a.progress)
    .find((goal) => goal.savedPaise > 0) ?? goals[0] ?? null;

  return (
    <div className="grid gap-6">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Month summary">
        <StatCard
          icon={Wallet2}
          label="Spent this month"
          value={<Money paise={data.spendPaise} className="text-lg font-semibold" />}
          foot={`Avg ${formatPaise(data.avgDailySpendPaise)} a day`}
        />
        <StatCard
          icon={Coins}
          label="Income this month"
          value={<Money paise={data.incomePaise} tone="positive" className="text-lg font-semibold" />}
          foot={data.currentMonthLabel}
        />
        <StatCard
          icon={PiggyBank}
          label="Set aside"
          tone={data.savingsPaise < 0 ? "negative" : "positive"}
          value={
            <Money
              paise={data.savingsPaise}
              tone={data.savingsPaise < 0 ? "negative" : "positive"}
              className="text-lg font-semibold"
            />
          }
          foot={
            savingsPercent !== null
              ? `${Math.abs(savingsPercent)}% of income`
              : "Income − spend"
          }
        />
        <StatCard
          icon={delta === null ? Scale : delta < 0 ? TrendingDown : TrendingUp}
          label="Spend vs last month"
          tone={delta !== null && delta < 0 ? "positive" : delta !== null && delta > 0 ? "negative" : undefined}
          value={
            <span className="text-lg font-semibold tabular-nums">
              {delta !== null ? `${delta > 0 ? "+" : ""}${delta}%` : "—"}
            </span>
          }
          foot={delta !== null ? `₹${formatPaiseCompact(data.prevMonthSpendPaise)} last month` : "No last-month data"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Trend — last 6 months</CardTitle>
          <CardDescription>How your spend and income have moved month by month.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={trendConfig} className="aspect-auto h-72 w-full">
            <BarChart data={data.trend} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={8}
                axisLine={false}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={52}
                tickFormatter={(value) => formatPaiseCompact(Number(value))}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={chartTooltipFormatter} />}
              />
              <Bar dataKey="spend" fill="var(--color-spend)" radius={4} />
              <Bar dataKey="income" fill="var(--color-income)" radius={4} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
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
                <ChartContainer config={{}} className="mx-auto aspect-square h-56 w-full max-w-56 sm:max-w-none">
                  <PieChart>
                    <Pie
                      data={data.topCategories}
                      dataKey="spendPaise"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.topCategories.map((slice) => (
                        <Cell key={slice.id ?? "other"} fill={slice.color} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={<ChartTooltipContent formatter={chartTooltipFormatter} />}
                    />
                  </PieChart>
                </ChartContainer>
                <ul className="grid gap-1.5">
                  {data.topCategories.map((slice) => (
                    <li
                      key={slice.id ?? "other"}
                      className="flex items-center gap-2 text-sm"
                    >
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

        <Card>
          <CardHeader>
            <CardTitle>Goals</CardTitle>
            <CardDescription>Saved toward targets, straight from your wallet.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No goals yet.{" "}
                <Link href="/goals?new=goal" className="text-primary underline-offset-4 hover:underline">
                  Create one
                </Link>{" "}
                to start plotting progress here.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {monthGoalContribPaise > 0
                      ? `You stashed ${formatPaise(monthGoalContribPaise)} into goals this month.`
                      : "No money moved into goals this month."}
                  </p>
                </div>
                <ul className="grid gap-3">
                  {goals.slice(0, 4).map((goal) => (
                    <li key={goal.id} className="grid gap-1.5">
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate">{goal.name}</span>
                          {goal.status === "paused" ? (
                            <Badge variant="secondary">Paused</Badge>
                          ) : null}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {goal.progress}%
                        </span>
                      </div>
                      <Progress value={goal.progress} />
                      <p className="text-xs text-muted-foreground">
                        <Money paise={goal.savedPaise} /> of <Money paise={goal.targetPaise} />
                        {goal.requiredMonthlyPaise !== null
                          ? ` · ${formatPaise(goal.requiredMonthlyPaise)}/month to stay on pace`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" aria-hidden="true" />
            Notes for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5">
            {top && data.spendPaise > 0 ? (
              <Note>
                {top.name} is your biggest spend this month — {Math.round(top.share * 100)}% of the
                total ({formatPaise(top.spendPaise)}).
              </Note>
            ) : data.spendPaise > 0 ? (
              <Note>Spending is spread fairly evenly across categories this month.</Note>
            ) : null}

            {delta !== null ? (
              <Note tone={delta < 0 ? "positive" : delta > 0 ? "negative" : undefined}>
                You spent {delta > 0 ? `${delta}% more` : `${Math.abs(delta)}% less`} than last
                month{delta < 0 ? " — nice." : "."}
              </Note>
            ) : data.prevMonthSpendPaise === 0 && data.spendPaise > 0 ? (
              <Note>First month of spending on record, so there&apos;s nothing to compare yet.</Note>
            ) : null}

            {budgetPercent !== null ? (
              <Note tone={budgetPercent >= 100 ? "negative" : undefined}>
                You&apos;ve used {budgetPercent}% of your monthly budget this month
                {budgetPercent >= 100 ? " — you&apos;re over budget." : "."}
              </Note>
            ) : null}

            {data.incomePaise > 0 ? (
              data.savingsPaise >= 0 ? (
                <Note tone="positive">
                  You set aside {formatPaise(data.savingsPaise)} this month
                  {savingsPercent !== null ? ` (${savingsPercent}% of income)` : ""}.
                </Note>
              ) : (
                <Note tone="negative">
                  Spending beat income by {formatPaise(Math.abs(data.savingsPaise))} this month.
                </Note>
              )
            ) : null}

            {monthGoalContribPaise > 0 ? (
              <Note>Peeking at your goals — {formatPaise(monthGoalContribPaise)} moved into savings this month.</Note>
            ) : null}

            {featuredGoal && featuredGoal.requiredMonthlyPaise !== null ? (
              <Note>
                Setting aside {formatPaise(featuredGoal.requiredMonthlyPaise)} a month would get you
                to &quot;{featuredGoal.name}&quot; right on time.
              </Note>
            ) : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Note({
  tone,
  children,
}: {
  tone?: "positive" | "negative";
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "positive"
      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
      : tone === "negative"
        ? "border-destructive/30 bg-destructive/5 text-destructive"
        : "border-border/60 bg-muted/40";
  return (
    <li
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm ${toneClass}`}
    >
      <Sparkles
        className={`mt-0.5 size-4 shrink-0 ${tone === "negative" ? "text-destructive" : "text-primary"}`}
        aria-hidden="true"
      />
      <span>{children}</span>
    </li>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  foot,
  tone,
}: {
  icon: typeof Wallet2;
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
  tone?: "positive" | "negative";
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
        {foot ? <p className="text-xs text-muted-foreground">{foot}</p> : null}
      </CardContent>
    </Card>
  );
}