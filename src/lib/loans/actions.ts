"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE, datetimeLocalToUtc } from "@/lib/dates";
import { firstError, optional, readFormValue, toRpcAmount } from "@/lib/form-action-utils";
import { amountToPaise, loanInputSchema, repayLoanInputSchema } from "@/lib/validations/loans";

export type LoanActionResult = { success?: string; error?: string };

function touchPages() {
  revalidatePath("/loans");
  revalidatePath("/transactions");
  revalidatePath("/wallet");
  revalidatePath("/");
}

export async function recordLoanAction(formData: FormData): Promise<LoanActionResult> {
  await requireUser();
  const parsed = loanInputSchema.safeParse({
    direction: readFormValue(formData.get("direction")),
    person: readFormValue(formData.get("person")),
    principal: readFormValue(formData.get("principal")),
    dueDate: readFormValue(formData.get("dueDate")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_loan", {
    p_direction: parsed.data.direction,
    p_person: parsed.data.person,
    p_principal: toRpcAmount(amountToPaise(parsed.data.principal)),
    p_due_date: optional(parsed.data.dueDate) ?? null,
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: parsed.data.direction === "lent" ? "Loan recorded." : "Borrowing recorded." };
}

export async function repayLoanAction(formData: FormData): Promise<LoanActionResult> {
  await requireUser();
  const profile = await getProfile();
  const timeZone = profile?.timezone ?? DEFAULT_TIMEZONE;

  const parsed = repayLoanInputSchema.safeParse({
    loanId: readFormValue(formData.get("loanId")),
    amount: readFormValue(formData.get("amount")),
    note: readFormValue(formData.get("note")),
    occurredAt: readFormValue(formData.get("occurredAt")),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("repay_loan", {
    p_loan_id: parsed.data.loanId,
    p_amount: toRpcAmount(amountToPaise(parsed.data.amount)),
    p_note: optional(parsed.data.note),
    p_occurred_at: datetimeLocalToUtc(parsed.data.occurredAt, timeZone),
  });
  if (error) return { error: error.message };

  touchPages();
  return { success: "Repayment recorded." };
}