import { z } from "zod";
import { parseMoneyInput } from "@/lib/money";

const datetimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

/**
 * Shared amount field: user-entered rupee string (e.g. "1,234.50").
 * Validated and converted to integer paise inside the server actions.
 */
const amountInput = z
  .string({ message: "Enter an amount" })
  .trim()
  .min(1, "Enter an amount")
  .refine((value) => parseMoneyInput(value) !== null, "Enter a valid amount")
  .superRefine((value, ctx) => {
    const paise = parseMoneyInput(value);
    if (paise !== null && paise <= 0) {
      ctx.addIssue({ code: "custom", message: "Amount must be greater than zero" });
    }
  });

/** Parse a validated amount string back into integer paise (never null here). */
export function amountToPaise(value: string): number {
  return parseMoneyInput(value) ?? 0;
}

const occurredAtInput = z
  .string({ message: "Choose a date and time" })
  .min(1, "Choose a date and time")
  .regex(datetimeLocalPattern, "Choose a valid date and time");

export const expenseInputSchema = z.object({
  amount: amountInput,
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  merchant: shortText(120),
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export const incomeInputSchema = z.object({
  amount: amountInput,
  categoryId: z.string().optional(),
  source: shortText(120),
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export const adjustBalanceInputSchema = z.object({
  mode: z.enum(["add", "remove"], { message: "Choose add or remove" }),
  amount: amountInput.superRefine((value, ctx) => {
    const paise = parseMoneyInput(value);
    if (paise !== null && paise === 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be zero" });
    }
  }),
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
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export type ExpenseInputValues = z.infer<typeof expenseInputSchema>;
export type IncomeInputValues = z.infer<typeof incomeInputSchema>;
export type AdjustBalanceInputValues = z.infer<typeof adjustBalanceInputSchema>;
export type TransactionFilters = z.infer<typeof transactionsFilterSchema>;