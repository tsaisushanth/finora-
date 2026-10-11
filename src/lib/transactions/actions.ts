"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { datetimeLocalToUtc } from "@/lib/dates";
import { firstError, optional, readFormValue, toRpcAmount } from "@/lib/form-action-utils";
import {
  adjustBalanceInputSchema,
  amountToPaise,
  expenseInputSchema,
  incomeInputSchema,
  transactionsFilterSchema,
} from "@/lib/validations/transactions";
import {
  getTransactionOptions,
  listAllTransactions,
} from "@/lib/transactions/queries";

export type TransactionActionResult = { success?: string; error?: string };

function touchPages() {
  revalidatePath("/transactions");
  revalidatePath("/wallet");
  revalidatePath("/");
}

export async function createExpenseAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = expenseInputSchema.safeParse({
    amount: readFormValue(formData.get("amount")),
    categoryId: readFormValue(formData.get("categoryId")),
    paymentMethodId: readFormValue(formData.get("paymentMethodId")),
    merchant: readFormValue(formData.get("merchant")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const amountPaise = amountToPaise(parsed.data.amount);

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_expense", {
    p_amount: toRpcAmount(amountPaise),
    p_category_id: optional(parsed.data.categoryId),
    p_payment_method_id: optional(parsed.data.paymentMethodId),
    p_merchant: optional(parsed.data.merchant),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Expense saved." };
}

export async function updateExpenseAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = expenseInputSchema.safeParse({
    amount: readFormValue(formData.get("amount")),
    categoryId: readFormValue(formData.get("categoryId")),
    paymentMethodId: readFormValue(formData.get("paymentMethodId")),
    merchant: readFormValue(formData.get("merchant")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const amountPaise = amountToPaise(parsed.data.amount);
  const id = readFormValue(formData.get("id"));
  if (!id) return { error: "Missing expense id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_expense", {
    p_id: id,
    p_amount: toRpcAmount(amountPaise),
    p_category_id: optional(parsed.data.categoryId),
    p_payment_method_id: optional(parsed.data.paymentMethodId),
    p_merchant: optional(parsed.data.merchant),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Expense updated." };
}

export async function deleteExpenseAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const id = readFormValue(formData.get("id"));
  if (!id) return { error: "Missing expense id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_expense", { p_id: id });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Expense deleted." };
}

export async function createIncomeAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = incomeInputSchema.safeParse({
    amount: readFormValue(formData.get("amount")),
    categoryId: readFormValue(formData.get("categoryId")),
    source: readFormValue(formData.get("source")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const amountPaise = amountToPaise(parsed.data.amount);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_income", {
    p_amount: toRpcAmount(amountPaise),
    p_category_id: optional(parsed.data.categoryId),
    p_source: optional(parsed.data.source),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Income added." };
}

export async function deleteIncomeAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const id = readFormValue(formData.get("id"));
  if (!id) return { error: "Missing income id." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_income", { p_id: id });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Income deleted." };
}

export async function adjustBalanceAction(
  formData: FormData,
): Promise<TransactionActionResult> {
  await requireUser();
  const parsed = adjustBalanceInputSchema.safeParse({
    amount: readFormValue(formData.get("amount")),
    mode: readFormValue(formData.get("mode")) as "add" | "remove",
    reason: readFormValue(formData.get("reason")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const amountPaise = amountToPaise(parsed.data.amount);
  const delta = parsed.data.mode === "remove" ? -amountPaise : amountPaise;

  const supabase = await createClient();
  const { error } = await supabase.rpc("adjust_balance", {
    p_amount_delta: toRpcAmount(delta),
    p_reason: parsed.data.reason,
  });
  if (error) return { error: error.message };

  revalidatePath("/wallet");
  revalidatePath("/");
  return { success: parsed.data.mode === "remove" ? "Money removed." : "Money added." };
}

export async function exportTransactionsCsvAction(
  formData: FormData,
): Promise<{ csv?: string; filename?: string; error?: string }> {
  const user = await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = transactionsFilterSchema.safeParse({
    search: readFormValue(formData.get("search")),
    categoryId: readFormValue(formData.get("categoryId")),
    paymentMethodId: readFormValue(formData.get("paymentMethodId")),
    from: readFormValue(formData.get("from")),
    to: readFormValue(formData.get("to")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const [items, options] = await Promise.all([
    listAllTransactions(user.id, parsed.data, timeZone),
    getTransactionOptions(user.id),
  ]);
  const categoryNames = new Map(
    options.categories.map((c) => [c.id, c.name]),
  );
  const methodNames = new Map(
    options.paymentMethods.map((m) => [m.id, m.name]),
  );

  const { formatDateInTimeZone } = await import("@/lib/dates");
  const escapeCsv = (value: string) =>
    `"${value.replace(/"/g, '""')}"`;
  const rows = items.map((item) => [
    item.kind === "expense" ? "Expense" : "Income",
    formatDateInTimeZone(item.occurredAt, timeZone, "yyyy-MM-dd HH:mm"),
    item.amount.toFixed(2),
    item.title ?? "",
    item.categoryId ? (categoryNames.get(item.categoryId) ?? "") : "",
    item.paymentMethodId ? (methodNames.get(item.paymentMethodId) ?? "") : "",
    item.note ?? "",
  ]);
  const header = [
    "Type",
    "Date",
    "Amount (INR)",
    "Merchant / Source",
    "Category",
    "Payment method",
    "Note",
  ];
  const csv = `\uFEFF${[header, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n")}`;
  const filename = `finora-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  return { csv, filename };
}
