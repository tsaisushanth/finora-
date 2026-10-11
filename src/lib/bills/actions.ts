"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { amountToPaise } from "@/lib/validations/common";
import {
  confirmBillInputSchema,
  discardBillInputSchema,
} from "@/lib/validations/bills";
import { firstError, optional } from "@/lib/form-action-utils";
import { paiseToNumeric } from "@/lib/money";
import { datetimeLocalToUtc } from "@/lib/dates";

/** Turn a reviewed scan into a real expense + ledger entry (via `confirm_bill`). */
export async function confirmBillAction(formData: FormData) {
  const profile = await requireOnboardedProfile();
  const parsed = confirmBillInputSchema.safeParse({
    billId: (formData.get("billId") as string) ?? "",
    amount: (formData.get("amount") as string) ?? "",
    categoryId: (formData.get("categoryId") as string) ?? "",
    paymentMethodId: (formData.get("paymentMethodId") as string) ?? "",
    merchant: (formData.get("merchant") as string) ?? "",
    note: (formData.get("note") as string) ?? "",
    occurredAt: (formData.get("occurredAt") as string) ?? "",
    items: (formData.get("items") as string) ?? "[]",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const input = parsed.data;

  const payload: Record<string, unknown> = {
    amount: paiseToNumeric(amountToPaise(input.amount)),
    category_id: optional(input.categoryId),
    payment_method_id: optional(input.paymentMethodId),
    merchant: input.merchant,
    note: input.note,
    occurred_at: datetimeLocalToUtc(input.occurredAt, profile.timezone),
  };
  if (input.items.length > 0) {
    payload.items = input.items.map((item) => ({
      description: item.description || null,
      quantity: item.quantity ?? null,
      unit_price: item.unitPrice ?? null,
      amount: item.amount ?? null,
      suggested_category: item.suggestedCategory || null,
    }));
  }

  const supabase = await createClient();
  const rpc = await supabase.rpc("confirm_bill", {
    p_bill_id: input.billId,
    p_payload: payload,
  });
  if (rpc.error) return { error: rpc.error.message };

  revalidatePath("/bills/scan");
  revalidatePath(`/bills/scan/${input.billId}`);
  revalidatePath("/transactions");
  revalidatePath("/wallet");
  revalidatePath("/");
  return { success: "Expense created from bill." };
}

/** Mark a scan as not-an-expense so it leaves the review queue. */
export async function discardBillAction(formData: FormData) {
  const profile = await requireOnboardedProfile();
  const parsed = discardBillInputSchema.safeParse({
    billId: (formData.get("billId") as string) ?? "",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase
    .from("bills")
    .update({ status: "discarded" })
    .eq("user_id", profile.id)
    .eq("id", parsed.data.billId);
  if (error) return { error: error.message };

  revalidatePath("/bills/scan");
  revalidatePath(`/bills/scan/${parsed.data.billId}`);
  return { success: "Bill discarded." };
}