import { z } from "zod";
import { moneyInput, occurredAtInput, optionalDateInput, shortText } from "@/lib/validations/common";

export const loanInputSchema = z.object({
  direction: z.enum(["lent", "borrowed"], { message: "Choose lent or borrowed" }),
  person: z
    .string({ message: "Person is required" })
    .trim()
    .min(1, "Who's the person?")
    .max(80, "Must be 80 characters or fewer"),
  principal: moneyInput,
  dueDate: optionalDateInput,
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export const repayLoanInputSchema = z.object({
  loanId: z.string().min(1, "Pick a loan"),
  amount: moneyInput,
  note: shortText(240),
  occurredAt: occurredAtInput,
});

export type LoanInputValues = z.infer<typeof loanInputSchema>;
export type RepayLoanInputValues = z.infer<typeof repayLoanInputSchema>;

export { amountToPaise } from "@/lib/validations/common";