import "server-only";
import { createClient } from "@/lib/supabase/server";
import { numericToPaise } from "@/lib/money";

export type GoalItem = {
  id: string;
  name: string;
  description: string | null;
  targetPaise: number;
  categoryId: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  priority: "high" | "medium" | "low";
  targetDate: string | null;
  status: "active" | "paused" | "completed" | "archived";
  savedPaise: number;
  remainingPaise: number;
  progress: number;
  requiredMonthlyPaise: number | null;
};

export type GoalContribution = {
  id: string;
  goalId: string;
  kind: "contribution" | "withdrawal";
  amount: number;
  occurredAt: string;
  note: string | null;
};

/** Rough months until a target date (at least 1), used for the required-monthly estimate. */
function monthsUntil(from: Date, to: Date): number {
  const fullMonths =
    (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(1, to.getDate() < from.getDate() ? fullMonths : fullMonths + 1);
}

export async function getGoals(userId: string) {
  const supabase = await createClient();
  const [goalsResult, contribsResult, categoriesResult] = await Promise.all([
    supabase
      .from("goals")
      .select("id, name, description, target_amount, category_id, priority, target_date, status, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("goal_contributions")
      .select("id, goal_id, amount, kind, occurred_at, note")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("categories")
      .select("id, name, color")
      .eq("user_id", userId),
  ]);
  if (goalsResult.error) throw new Error(goalsResult.error.message);
  if (contribsResult.error) throw new Error(contribsResult.error.message);
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);

  const savedByGoal = new Map<string, number>();
  const contributions: GoalContribution[] = (contribsResult.data ?? []).map((row) => {
    const delta = row.kind === "contribution" ? numericToPaise(row.amount) : -numericToPaise(row.amount);
    savedByGoal.set(row.goal_id, (savedByGoal.get(row.goal_id) ?? 0) + delta);
    return {
      id: row.id,
      goalId: row.goal_id,
      kind: row.kind as "contribution" | "withdrawal",
      amount: row.amount,
      occurredAt: row.occurred_at,
      note: row.note,
    };
  });

  const categoryInfo = new Map(
    (categoriesResult.data ?? []).map((c) => [c.id, { name: c.name, color: c.color }]),
  );
  const today = new Date();

  const goals: GoalItem[] = (goalsResult.data ?? []).map((goal) => {
    const targetPaise = numericToPaise(goal.target_amount);
    const savedPaise = savedByGoal.get(goal.id) ?? 0;
    const remainingPaise = Math.max(0, targetPaise - savedPaise);
    const progress =
      targetPaise > 0 ? Math.min(100, Math.round((savedPaise / targetPaise) * 100)) : 0;

    let requiredMonthlyPaise: number | null = null;
    if (goal.target_date && (goal.status === "active" || goal.status === "paused")) {
      requiredMonthlyPaise = Math.ceil(
        remainingPaise / monthsUntil(today, new Date(`${goal.target_date}T00:00:00`)),
      );
    }

    const category = goal.category_id ? categoryInfo.get(goal.category_id) : undefined;
    return {
      id: goal.id,
      name: goal.name,
      description: goal.description,
      targetPaise,
      categoryId: goal.category_id,
      categoryName: category?.name ?? null,
      categoryColor: category?.color ?? null,
      priority: goal.priority as GoalItem["priority"],
      targetDate: goal.target_date,
      status: goal.status as GoalItem["status"],
      savedPaise,
      remainingPaise,
      progress,
      requiredMonthlyPaise,
    };
  });

  return { goals, contributions };
}

/** `kind = 'goal'` categories for the goal form. */
export async function getGoalCategories(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, color")
    .eq("user_id", userId)
    .eq("kind", "goal")
    .is("archived_at", null)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}