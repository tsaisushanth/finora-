import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { numericToPaise } from "@/lib/money";

export type TrendPoint = {
  key: string;
  label: string;
  spendPaise: number;
  incomePaise: number;
};

export type CategorySlice = {
  id: string | null;
  name: string;
  color: string;
  spendPaise: number;
  share: number;
};

export type InsightsData = {
  currentMonthLabel: string;
  spendPaise: number;
  incomePaise: number;
  savingsPaise: number;
  budgetPaise: number;
  prevMonthSpendPaise: number;
  avgDailySpendPaise: number;
  trend: TrendPoint[];
  topCategories: CategorySlice[];
};

const MONTHS_BACK = 5;
const OTHER_COLOR = "#94a3b8";

function monthKey(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "yyyy-MM");
}

function currentMonthKey(timeZone: string): string {
  return monthKey(new Date(), timeZone);
}

function addMonths(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(1);
  next.setMonth(next.getMonth() + delta);
  return next;
}

function monthKeyStartIso(ym: string, timeZone: string): string {
  return fromZonedTime(new Date(`${ym}-01T00:00:00`), timeZone).toISOString();
}

function shortMonthLabel(ym: string, timeZone: string): string {
  return formatInTimeZone(new Date(`${ym}-15T12:00:00`), timeZone, "MMM");
}

export async function getInsights(
  userId: string,
  timeZone: string = DEFAULT_TIMEZONE,
  budgetPaise: number = 0,
): Promise<InsightsData> {
  const supabase = await createClient();
  const now = new Date();
  const curYm = currentMonthKey(timeZone);
  const prevYm = monthKey(addMonths(now, -1), timeZone);
  const windowStart = monthKeyStartIso(monthKey(addMonths(now, -MONTHS_BACK), timeZone), timeZone);

  const [expenseResult, incomeResult, categoryResult] = await Promise.all([
    supabase
      .from("expenses")
      .select("amount, category_id, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", windowStart),
    supabase
      .from("income_entries")
      .select("amount, occurred_at")
      .eq("user_id", userId)
      .gte("occurred_at", windowStart),
    supabase.from("categories").select("id, name, color").eq("user_id", userId),
  ]);
  if (expenseResult.error) throw new Error(expenseResult.error.message);
  if (incomeResult.error) throw new Error(incomeResult.error.message);
  if (categoryResult.error) throw new Error(categoryResult.error.message);

  const categoryNames = new Map<string, { name: string; color: string }>();
  for (const category of categoryResult.data ?? []) {
    categoryNames.set(category.id, { name: category.name, color: category.color || OTHER_COLOR });
  }
  const nameFor = (id: string | null): { name: string; color: string } =>
    id ? categoryNames.get(id) ?? { name: "Other", color: OTHER_COLOR } : { name: "Other", color: OTHER_COLOR };

  const trendMap = new Map<string, { spendPaise: number; incomePaise: number }>();
  for (let i = MONTHS_BACK; i >= 0; i--) {
    const ym = monthKey(addMonths(now, -i), timeZone);
    trendMap.set(ym, { spendPaise: 0, incomePaise: 0 });
  }

  let spendPaise = 0;
  let incomePaise = 0;
  let prevMonthSpendPaise = 0;
  const currentByCategory = new Map<string | null, number>();

  for (const row of expenseResult.data ?? []) {
    const point = trendMap.get(monthKey(new Date(row.occurred_at), timeZone));
    if (!point) continue;
    const paise = numericToPaise(row.amount);
    point.spendPaise += paise;
    const ym = monthKey(new Date(row.occurred_at), timeZone);
    if (ym === curYm) {
      spendPaise += paise;
      currentByCategory.set(row.category_id, (currentByCategory.get(row.category_id) ?? 0) + paise);
    } else if (ym === prevYm) {
      prevMonthSpendPaise += paise;
    }
  }

  for (const row of incomeResult.data ?? []) {
    const point = trendMap.get(monthKey(new Date(row.occurred_at), timeZone));
    if (!point) continue;
    const paise = numericToPaise(row.amount);
    point.incomePaise += paise;
    if (monthKey(new Date(row.occurred_at), timeZone) === curYm) incomePaise += paise;
  }

  const topCategories: CategorySlice[] = [...currentByCategory.entries()]
    .map(([id, amount]) => {
      const meta = nameFor(id);
      return {
        id,
        name: meta.name,
        color: meta.color,
        spendPaise: amount,
        share: spendPaise > 0 ? amount / spendPaise : 0,
      };
    })
    .sort((a, b) => b.spendPaise - a.spendPaise)
    .slice(0, 6);

  const trend: TrendPoint[] = [...trendMap.entries()].map(([ym, point]) => ({
    key: ym,
    label: shortMonthLabel(ym, timeZone),
    spendPaise: point.spendPaise,
    incomePaise: point.incomePaise,
  }));

  const dayOfMonth =
    Math.max(1, Number.parseInt(formatInTimeZone(now, timeZone, "d"), 10) || 1);

  return {
    currentMonthLabel: formatInTimeZone(now, timeZone, "MMMM yyyy"),
    spendPaise,
    incomePaise,
    savingsPaise: incomePaise - spendPaise,
    budgetPaise,
    prevMonthSpendPaise,
    avgDailySpendPaise: Math.round(spendPaise / dayOfMonth),
    trend,
    topCategories,
  };
}

/** Net goal contributions (saved minus withdrawn) that landed in the current month. */
export function sumMonthGoalContributions(
  contributions: { amount: number; kind: string; occurredAt: string }[],
  timeZone: string = DEFAULT_TIMEZONE,
): number {
  const curYm = currentMonthKey(timeZone);
  let total = 0;
  for (const row of contributions) {
    if (monthKey(new Date(row.occurredAt), timeZone) !== curYm) continue;
    const paise = numericToPaise(row.amount);
    total += row.kind === "contribution" ? paise : -paise;
  }
  return total;
}