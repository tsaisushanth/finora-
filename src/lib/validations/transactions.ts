import { z } from "zod";
import {
  moneyInput,
  occurredAtInput,
  optionalDateInput,
  shortText,
} from "@/lib/validations/common";

/**
 * Shared form input shapes used by the server actions. Amounts are validated as
 * rupee strings and converted to integer paise inside the actions.
 */

export const expenseInputSchema = z.object({
  amount: moneyInput,
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  merchant: shortText(120),
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export const incomeInputSchema = z.object({
  amount: moneyInput,
  categoryId: z.string().optional(),
  source: shortText(120),
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export const adjustBalanceInputSchema = z.object({
  mode: z.enum(["add", "remove"], { message: "Choose add or remove" }),
  amount: moneyInput,
  reason: z
    .string({ message: "Enter a reason" })
    .trim()
    .min(3, "Tell us why (at least 3 characters)")
    .max(200, "Reason is too long"),
});

export const transactionsFilterSchema = z.object({
  search: z.string().trim().max(120).optional(),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  from: optionalDateInput,
  to: optionalDateInput,
  page: z.coerce.number().int().min(1).default(1),
});

export type ExpenseInputValues = z.infer<typeof expenseInputSchema>;
export type IncomeInputValues = z.infer<typeof incomeInputSchema>;
export type AdjustBalanceInputValues = z.infer<typeof adjustBalanceInputSchema>;
export type TransactionFilters = z.infer<typeof transactionsFilterSchema>;

export { amountToPaise } from "@/lib/validations/common";