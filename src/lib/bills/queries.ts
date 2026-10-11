import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import type { AiBillExtraction } from "@/lib/ai/schema";
import type { SanityFlag } from "@/lib/ai/sanity";

export type ScanStatus = "processing" | "needs_review" | "confirmed" | "failed" | "discarded";

export type Scan = {
  id: string;
  status: ScanStatus;
  storagePath: string;
  originalFilename: string | null;
  mimeType: string | null;
  provider: string | null;
  model: string | null;
  documentType: string | null;
  isABill: boolean | null;
  extraction: AiBillExtraction | null;
  sanityFlags: SanityFlag[] | null;
  confidence: { score: number } | null;
  errorMessage: string | null;
  expenseId: string | null;
  createdAt: string;
};

const SCAN_COLUMNS =
  "id, storage_path, original_filename, mime_type, provider, model, document_type, is_a_bill, extraction, sanity_flags, confidence, error_message, expense_id, status, created_at";

function toScan(row: Record<string, unknown>): Scan {
  return {
    id: row.id as string,
    status: row.status as ScanStatus,
    storagePath: row.storage_path as string,
    originalFilename: (row.original_filename as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    provider: (row.provider as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    documentType: (row.document_type as string | null) ?? null,
    isABill: (row.is_a_bill as boolean | null) ?? null,
    extraction: (row.extraction as AiBillExtraction | null) ?? null,
    sanityFlags: (row.sanity_flags as SanityFlag[] | null) ?? null,
    confidence: (row.confidence as { score: number } | null) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    expenseId: (row.expense_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

/** The user's recent scans, newest first (for the scan page history). */
export async function listScans(userId: string): Promise<Scan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bills")
    .select(SCAN_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => toScan(row as unknown as Record<string, unknown>));
}

/**
 * One scan plus a short-lived signed URL for the private receipt image.
 * Returns null when the bill isn't the user's.
 */
export async function getBill(
  userId: string,
  billId: string,
): Promise<{ bill: Scan; signedUrl: string | null } | null> {
  const supabase = await createClient();
  const billResult = await supabase
    .from("bills")
    .select(SCAN_COLUMNS)
    .eq("user_id", userId)
    .eq("id", billId)
    .maybeSingle();
  if (billResult.error) throw new Error(billResult.error.message);
  if (!billResult.data) return null;

  const bill = toScan(billResult.data as unknown as Record<string, unknown>);

  let signedUrl: string | null = null;
  try {
    const admin = getAdminClient();
    const signed = await admin.storage.from("bills").createSignedUrl(bill.storagePath, 3600);
    signedUrl = signed.error ? null : signed.data.signedUrl;
  } catch {
    signedUrl = null;
  }

  return { bill, signedUrl };
}