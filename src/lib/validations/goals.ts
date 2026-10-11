import { z } from "zod";
import { moneyInput, occurredAtInput, optionalDateInput, shortText } from "@/lib/validations/common";

export const goalInputSchema = z.object({
  name: z
    .string({ message: "Goal name is required" })
    .trim()
    .min(1, "Goal name is required")
    .max(80, "Must be 80 characters or fewer"),
  targetAmount: moneyInput,
  categoryId: z.string().optional(),
  priority: z.enum(["high", "medium", "low"], { message: "Choose a priority" }),
  targetDate: optionalDateInput,
  description: shortText(400),
});

/** Used for both contributing to and withdrawing from a goal. */
export const goalMoneyInputSchema = z.object({
  goalId: z.string().min(1, "Pick a goal"),
  amount: moneyInput,
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export type GoalInputValues = z.infer<typeof goalInputSchema>;
export type GoalMoneyInputValues = z.infer<typeof goalMoneyInputSchema>;

export { amountToPaise } from "@/lib/validations/common";