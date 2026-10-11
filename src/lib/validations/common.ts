import { z } from "zod";
import { parseMoneyInput } from "@/lib/money";

/**
 * Shared zod building blocks for user-entered money and local datetime strings.
 * Duplicated across forms (transactions, goals, loans) and validated again in the
 * server actions, so every schema stays consistent.
 */

/** Optional short text (also tolerates an empty string from optional fields). */
export const shortText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be ${max} characters or fewer`)
    .optional()
    .or(z.literal(""));

/**
 * User-entered rupee string (e.g. "1,234.50"). Validated and converted to
 * integer paise inside the server actions.
 */
export const moneyInput = z
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

/** Local wall-clock value for `<input type="datetime-local">`. */
export const occurredAtInput = z
  .string({ message: "Choose a date and time" })
  .min(1, "Choose a date and time")
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Choose a valid date and time");

/** Optional calendar date (`yyyy-MM-dd`) for `<input type="date">`. */
export const optionalDateInput = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .optional()
  .or(z.literal(""));