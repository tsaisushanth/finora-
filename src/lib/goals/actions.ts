"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, datetimeLocalToUtc } from "@/lib/dates";
import { firstError, optional, readFormValue, toRpcAmount } from "@/lib/form-action-utils";
import {
  amountToPaise,
  goalInputSchema,
  goalMoneyInputSchema,
} from "@/lib/validations/goals";

export type GoalActionResult = { success?: string; error?: string };

function touchPages() {
  revalidatePath("/goals");
  revalidatePath("/transactions");
  revalidatePath("/wallet");
  revalidatePath("/");
}

export async function createGoalAction(formData: FormData): Promise<GoalActionResult> {
  await requireUser();
  const parsed = goalInputSchema.safeParse({
    name: readFormValue(formData.get("name")),
    targetAmount: readFormValue(formData.get("targetAmount")),
    categoryId: readFormValue(formData.get("categoryId")),
    priority: readFormValue(formData.get("priority")),
    targetDate: readFormValue(formData.get("targetDate")),
    description: readFormValue(formData.get("description")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_goal", {
    p_name: parsed.data.name,
    p_target_amount: toRpcAmount(amountToPaise(parsed.data.targetAmount)),
    p_category_id: optional(parsed.data.categoryId),
    p_priority: parsed.data.priority,
    p_target_date: optional(parsed.data.targetDate) ?? null,
    p_description: optional(parsed.data.description),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Goal created." };
}

export async function updateGoalAction(formData: FormData): Promise<GoalActionResult> {
  await requireUser();
  const id = readFormValue(formData.get("id"));
  if (!id) return { error: "Missing goal id." };

  const parsed = goalInputSchema.safeParse({
    name: readFormValue(formData.get("name")),
    targetAmount: readFormValue(formData.get("targetAmount")),
    categoryId: readFormValue(formData.get("categoryId")),
    priority: readFormValue(formData.get("priority")),
    targetDate: readFormValue(formData.get("targetDate")),
    description: readFormValue(formData.get("description")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_goal", {
    p_id: id,
    p_name: parsed.data.name,
    p_target_amount: toRpcAmount(amountToPaise(parsed.data.targetAmount)),
    p_category_id: optional(parsed.data.categoryId),
    p_priority: parsed.data.priority,
    p_target_date: optional(parsed.data.targetDate) ?? null,
    p_description: optional(parsed.data.description),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Goal updated." };
}

const GOAL_STATUSES = ["active", "paused"] as const;

/** Pause/resume toggles a single column, so a direct RLS-guarded update is atomic enough. */
export async function setGoalStatusAction(formData: FormData): Promise<GoalActionResult> {
  const user = await requireUser();
  const id = readFormValue(formData.get("id"));
  const status = readFormValue(formData.get("status")) as (typeof GOAL_STATUSES)[number];
  if (!id) return { error: "Missing goal id." };
  if (!GOAL_STATUSES.includes(status)) return { error: "Invalid status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("goals")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  touchPages();
  return { success: status === "paused" ? "Goal paused." : "Goal resumed." };
}

export async function contributeToGoalAction(formData: FormData): Promise<GoalActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = goalMoneyInputSchema.safeParse({
    goalId: readFormValue(formData.get("goalId")),
    amount: readFormValue(formData.get("amount")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("contribute_to_goal", {
    p_goal_id: parsed.data.goalId,
    p_amount: toRpcAmount(amountToPaise(parsed.data.amount)),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Money moved to goal." };
}

export async function withdrawFromGoalAction(formData: FormData): Promise<GoalActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = goalMoneyInputSchema.safeParse({
    goalId: readFormValue(formData.get("goalId")),
    amount: readFormValue(formData.get("amount")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("withdraw_from_goal", {
    p_goal_id: parsed.data.goalId,
    p_amount: toRpcAmount(amountToPaise(parsed.data.amount)),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Money returned to wallet." };
}

export async function deleteGoalAction(formData: FormData): Promise<GoalActionResult> {
  await requireUser();
  const id = readFormValue(formData.get("id"));
  if (!id) return { error: "Missing goal id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_goal", { p_goal_id: id });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Goal deleted. Its saved amount returned to your wallet." };
}