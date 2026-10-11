import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { aiBillExtractionSchema, type AiBillExtraction } from "@/lib/ai/schema";
import { stripJsonFence } from "@/lib/ai/prompt";
import { runSanityChecks } from "@/lib/ai/sanity";
import { extractBillText, visionProviderName } from "@/lib/ai/providers";

export const runtime = "nodejs";

const SCAN_LIMIT = 10;
const SCAN_WINDOW_MS = 60 * 60 * 1000;
const scanRequestSchema = z.object({ billId: z.uuid() });

type AdminClient = ReturnType<typeof getAdminClient>;

async function markFailed(
  admin: AdminClient,
  billId: string,
  message: string,
) {
  await admin
    .from("bills")
    .update({
      status: "failed",
      error_message: message.slice(0, 500),
      updated_at: new Date().toISOString(),
    })
    .eq("id", billId);
}

/**
 * POST /api/bills/scan  { billId }
 * Runs the AI vision pipeline for a bill the user already uploaded to
 * Storage: download → extract → validate (zod, one retry) → sanity-check →
 * persist the result back onto the bill row for review. The actual expense is
 * only created later via `confirm_bill` on the review page.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }
  const parsed = scanRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const billId = parsed.data.billId;

  const { data: bill, error: billError } = await supabase
    .from("bills")
    .select("id, storage_path, mime_type, status")
    .eq("id", billId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (billError) {
    return NextResponse.json({ error: "Could not read the bill record" }, { status: 500 });
  }
  if (!bill) return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  if (bill.status !== "processing") {
    return NextResponse.json({ error: "This bill was already processed" }, { status: 409 });
  }

  const { count } = await supabase
    .from("bills")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", new Date(Date.now() - SCAN_WINDOW_MS).toISOString());
  if ((count ?? 0) >= SCAN_LIMIT) {
    return NextResponse.json(
      { error: "Scan limit reached — try again in about an hour." },
      { status: 429 },
    );
  }

  const admin = getAdminClient();
  const { data: blob, error: downloadError } = await admin.storage
    .from("bills")
    .download(bill.storage_path);
  if (downloadError || !blob) {
    return NextResponse.json({ error: "Could not read the uploaded image" }, { status: 502 });
  }
  const mimeType = bill.mime_type ?? "image/jpeg";
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

  let raw: unknown = null;
  let model = "";
  try {
    for (let attempt = 0; attempt < 2 && raw === null; attempt++) {
      const result = await extractBillText({ mimeType, base64 });
      model = result.model;
      const stripped = stripJsonFence(result.text);
      try {
        raw = JSON.parse(stripped);
      } catch {
        raw = null;
      }
    }
  } catch (err) {
    await markFailed(admin, billId, err instanceof Error ? err.message : "Vision provider error");
    return NextResponse.json({ error: "The AI provider could not be reached." }, { status: 502 });
  }

  const validation = aiBillExtractionSchema.safeParse(raw);
  if (!validation.success) {
    await markFailed(admin, billId, "The AI could not return a valid bill reading.");
    return NextResponse.json(
      { error: "Could not read this bill. It may be blurry or unsupported." },
      { status: 422 },
    );
  }
  const extraction: AiBillExtraction = validation.data;
  const sanity = runSanityChecks(extraction);

  const { error: updateError } = await admin
    .from("bills")
    .update({
      status: "needs_review",
      provider: visionProviderName(),
      model,
      document_type: extraction.documentType,
      is_a_bill: extraction.isABill,
      extraction,
      sanity_flags: sanity.flags,
      confidence: { score: sanity.confidence },
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", billId);
  if (updateError) {
    return NextResponse.json({ error: "Failed to save the scan result" }, { status: 500 });
  }

  return NextResponse.json({
    billId,
    status: "needs_review",
    extraction,
    sanityFlags: sanity.flags,
    confidence: sanity.confidence,
  });
}