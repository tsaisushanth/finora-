import type { AiBillExtraction } from "@/lib/ai/schema";

export type SanityFlag = {
  code: string;
  message: string;
  severity: "warning";
};

export type SanityResult = {
  flags: SanityFlag[];
  /** Sum of the extracted line-item amounts, in paise. */
  itemsSumPaise: number;
  /** True when line items (if any) roughly reconcile with the total. */
  itemsMatchTotal: boolean;
  /** 0..1 heuristic used to flag scans that deserve a closer look. */
  confidence: number;
};

const TOLERANCE_PAISE = 100;
const TOLERANCE_FRACTION = 0.02;

function itemAmountPaise(item: {
  amount?: number | string;
  unitPrice?: number | string;
  quantity?: number | string;
}): number | null {
  const toNumber = (value: number | string | undefined): number | null => {
    if (value === undefined) return null;
    const parsed = typeof value === "number" ? value : Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const amount = toNumber(item.amount);
  if (amount !== null) return Math.round(amount * 100);
  const unitPrice = toNumber(item.unitPrice);
  const quantity = toNumber(item.quantity);
  if (unitPrice !== null && quantity !== null && quantity > 0) {
    return Math.round(unitPrice * quantity * 100);
  }
  return null;
}

/**
 * Post-AI sanity checks on the extracted data. These run on the server before
 * a scan is offered to the user for confirmation, guarding against blurry
 * photos and hallucinated numbers.
 */
export function runSanityChecks(extraction: AiBillExtraction): SanityResult {
  const flags: SanityFlag[] = [];
  let confidence = 1;

  const warn = (code: string, message: string) => {
    flags.push({ code, message, severity: "warning" });
    confidence -= 0.2;
  };

  const totalPaise = Math.round(extraction.total * 100);
  let itemsSumPaise = 0;
  let countedItems = 0;
  for (const item of extraction.items) {
    const amountPaise = itemAmountPaise(item);
    if (amountPaise !== null) {
      itemsSumPaise += amountPaise;
      countedItems += 1;
    }
  }

  const tolerance = Math.max(TOLERANCE_PAISE, Math.round(totalPaise * TOLERANCE_FRACTION));
  const itemsMatchTotal =
    countedItems === 0 || Math.abs(itemsSumPaise - totalPaise) <= tolerance;
  if (!itemsMatchTotal) {
    warn(
      "items_total_mismatch",
      "The line items don't add up to the total — double-check the amount.",
    );
  }

  if (!extraction.merchant) {
    warn("missing_merchant", "No store or merchant was detected.");
  }

  if (!extraction.date) {
    warn("missing_date", "No date was detected on the bill.");
  }

  return {
    flags,
    itemsSumPaise,
    itemsMatchTotal,
    confidence: Math.max(0, Math.round(confidence * 100) / 100),
  };
}