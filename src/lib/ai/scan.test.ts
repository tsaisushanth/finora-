import { describe, expect, it } from "vitest";
import { aiBillExtractionSchema } from "@/lib/ai/schema";
import { stripJsonFence } from "@/lib/ai/prompt";
import { runSanityChecks } from "@/lib/ai/sanity";

const GOOD_EXTRACTION = {
  documentType: "receipt",
  isABill: true,
  merchant: "  Cafe Coffee Day  ",
  date: "2026-10-05",
  total: 249.5,
  currency: "INR",
  items: [
    {
      description: "Cold coffee",
      quantity: 1,
      unitPrice: 199,
      amount: 199,
      suggestedCategory: "food",
    },
    {
      description: "Tax",
      quantity: 1,
      unitPrice: 50.5,
      amount: 50.5,
      suggestedCategory: "other",
    },
  ],
};

describe("stripJsonFence", () => {
  it("removes markdown code fences", () => {
    const fenced = "```json\n{\"a\": 1}\n```";
    expect(stripJsonFence(fenced)).toBe("{\"a\": 1}");
  });

  it("returns plain JSON untouched", () => {
    const plain = '{"a": 1}';
    expect(stripJsonFence(plain)).toBe(plain);
  });
});

describe("aiBillExtractionSchema", () => {
  it("parses a canonical receipt reading", () => {
    const parsed = aiBillExtractionSchema.safeParse(GOOD_EXTRACTION);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.merchant).toBe("Cafe Coffee Day");
    expect(parsed.data.total).toBe(249.5);
    expect(parsed.data.items).toHaveLength(2);
  });

  it("tolerates a missing isABill/documentType by defaulting", () => {
    const parsed = aiBillExtractionSchema.safeParse({
      merchant: GOOD_EXTRACTION.merchant,
      date: GOOD_EXTRACTION.date,
      total: GOOD_EXTRACTION.total,
      currency: GOOD_EXTRACTION.currency,
      items: GOOD_EXTRACTION.items,
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.isABill).toBe(true);
    expect(parsed.data.documentType).toBe("other");
  });

  it("rejects a non-positive or missing total", () => {
    expect(aiBillExtractionSchema.safeParse({ ...GOOD_EXTRACTION, total: 0 }).success).toBe(false);
    expect(aiBillExtractionSchema.safeParse({ ...GOOD_EXTRACTION, total: -5 }).success).toBe(false);
    const withoutTotal = {
      documentType: GOOD_EXTRACTION.documentType,
      isABill: GOOD_EXTRACTION.isABill,
      merchant: GOOD_EXTRACTION.merchant,
      date: GOOD_EXTRACTION.date,
      currency: GOOD_EXTRACTION.currency,
      items: GOOD_EXTRACTION.items,
    };
    expect(aiBillExtractionSchema.safeParse(withoutTotal).success).toBe(false);
  });
});

describe("runSanityChecks", () => {
  it("flags nothing when items reconcile and meta is present", () => {
    const result = runSanityChecks(aiBillExtractionSchema.parse(GOOD_EXTRACTION));
    expect(result.itemsMatchTotal).toBe(true);
    expect(result.itemsSumPaise).toBe(24950);
    expect(result.flags).toHaveLength(0);
    expect(result.confidence).toBe(1);
  });

  it("warns when line items don't match the total", () => {
    const broken = {
      ...GOOD_EXTRACTION,
      items: [{ ...GOOD_EXTRACTION.items[0], amount: 50 }],
    };
    const result = runSanityChecks(aiBillExtractionSchema.parse(broken));
    expect(result.itemsMatchTotal).toBe(false);
    expect(result.flags.map((f) => f.code)).toContain("items_total_mismatch");
    expect(result.confidence).toBe(0.8);
  });

  it("warns on missing merchant and date", () => {
    const sparse = {
      ...GOOD_EXTRACTION,
      merchant: "",
      date: undefined,
    };
    const result = runSanityChecks(aiBillExtractionSchema.parse(sparse));
    const codes = result.flags.map((f) => f.code);
    expect(codes).toContain("missing_merchant");
    expect(codes).toContain("missing_date");
    expect(result.confidence).toBe(0.6);
  });
});