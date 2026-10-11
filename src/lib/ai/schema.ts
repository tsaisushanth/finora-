import { z } from "zod";

export const aiBillItemSchema = z.object({
  description: z.string().trim().max(200).optional(),
  /** 1-quantity line items are the norm; a string is tolerated from providers. */
  quantity: z.union([z.number().positive(), z.string().trim()]).optional(),
  unitPrice: z.union([z.number().nonnegative(), z.string().trim()]).optional(),
  amount: z.union([z.number().nonnegative(), z.string().trim()]).optional(),
  suggestedCategory: z.string().trim().max(80).optional(),
});

export const aiBillExtractionSchema = z.object({
  documentType: z
    .enum(["receipt", "invoice", "bill", "other"])
    .catch("other"),
  isABill: z.boolean().catch(true),
  merchant: z.string().trim().max(150).catch(""),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a YYYY-MM-DD date")
    .optional(),
  /** Final amount the customer paid, in rupees. */
  total: z
    .union([z.number().positive(), z.string().trim()])
    .transform((value) => {
      const parsed = typeof value === "number" ? value : Number.parseFloat(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : NaN;
    })
    .refine((value) => Number.isFinite(value) && value > 0, {
      message: "Total must be a positive number",
    }),
  currency: z.string().trim().max(8).catch(""),
  items: z.array(aiBillItemSchema).max(150).catch([]),
});

export type AiBillItem = z.infer<typeof aiBillItemSchema>;
export type AiBillExtraction = z.infer<typeof aiBillExtractionSchema>;