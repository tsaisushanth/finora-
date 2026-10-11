import { z } from "zod";
import { moneyInput, occurredAtInput, shortText } from "@/lib/validations/common";

const confirmItemNumber = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed >= 0;
  }, "Enter a valid number");

export const confirmBillItemSchema = z.object({
  description: shortText(200),
  quantity: confirmItemNumber.optional(),
  unitPrice: confirmItemNumber.optional(),
  amount: confirmItemNumber.optional(),
  suggestedCategory: shortText(80),
});

/** Payload for the review form: one expense + optional line items. */
export const confirmBillInputSchema = z.object({
  billId: z.uuid(),
  amount: moneyInput,
  categoryId: z.string().trim().optional(),
  paymentMethodId: z.string().trim().optional(),
  merchant: shortText(120),
  note: shortText(500),
  occurredAt: occurredAtInput,
  /** JSON-stringified line items (so the form can carry them as one value). */
  items: z
    .string()
    .optional()
    .default("[]")
    .transform((raw) => {
      try {
        const parsed: unknown = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })
    .pipe(z.array(confirmBillItemSchema).max(60)),
});

export const discardBillInputSchema = z.object({
  billId: z.uuid(),
});

export type ConfirmBillInputValues = z.infer<typeof confirmBillInputSchema>;
export type ConfirmBillItemValues = z.infer<typeof confirmBillItemSchema>;