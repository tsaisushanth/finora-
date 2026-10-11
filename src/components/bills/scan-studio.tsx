"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, ReceiptText, ScanLine } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { formatDateTimeInTimeZone } from "@/lib/dates";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { Progress } from "@/components/ui/progress";
import type { Scan, ScanStatus } from "@/lib/bills/queries";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const STATUS_META: Record<ScanStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" }> = {
  processing: { label: "Processing", variant: "outline" },
  needs_review: { label: "Needs review", variant: "default" },
  confirmed: { label: "Confirmed", variant: "ghost" },
  failed: { label: "Failed", variant: "destructive" },
  discarded: { label: "Discarded", variant: "secondary" },
};

type Phase = "idle" | "uploading" | "scanning" | "done" | "failed";

export function ScanStudio({ scans, timezone }: { scans: Scan[]; timezone: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function scanFile(file: File) {
    setError(null);
    setPhase("uploading");
    setProgress(8);

    if (!ACCEPTED.includes(file.type)) {
      setPhase("failed");
      setError("JPG, PNG or WebP photos work best.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setPhase("failed");
      setError("Keep the photo under 8 MB.");
      return;
    }

    const supabase = getBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setPhase("failed");
      setError("You need to be signed in to scan a bill.");
      return;
    }

    const path = `bills/${user.id}/${crypto.randomUUID()}${EXT_BY_MIME[file.type] ?? ".jpg"}`;
    const upload = await supabase.storage.from("bills").upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
    if (upload.error) {
      setPhase("failed");
      setError("The upload failed — check your connection and try again.");
      return;
    }
    setProgress(35);

    const insert = await supabase
      .from("bills")
      .insert({
        user_id: user.id,
        storage_path: path,
        original_filename: file.name,
        mime_type: file.type,
        size_bytes: file.size,
        status: "processing",
      })
      .select("id")
      .single();
    if (insert.error || !insert.data) {
      setPhase("failed");
      setError("Could not save the scan record. Please try again.");
      return;
    }
    setProgress(55);

    setPhase("scanning");
    setProgress(75);
    const response = await fetch("/api/bills/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ billId: insert.data.id }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok || !body) {
      setPhase("failed");
      setError(body?.error ?? "The scan failed. Please try again.");
      return;
    }
    setProgress(100);
    setPhase("done");
    router.push(`/bills/scan/${insert.data.id}`);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void scanFile(file);
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = Array.from(event.dataTransfer.files ?? []).find((f) => ACCEPTED.includes(f.type));
    if (file) void scanFile(file);
  }

  const busy = phase === "uploading" || phase === "scanning";

  return (
    <div className="grid gap-6">
      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        className="rounded-xl border border-dashed bg-card p-6 text-center"
      >
        <input
          id="scan-file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={busy}
          onChange={handleFileChange}
        />
        <label
          htmlFor="scan-file"
          className="grid cursor-pointer gap-3 place-items-center py-6"
          aria-disabled={busy}
        >
          <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
            {busy ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <ScanLine className="size-6" aria-hidden="true" />}
          </span>
          <span className="text-sm font-medium">
            {phase === "uploading" || phase === "scanning"
              ? phase === "uploading"
                ? "Uploading your bill…"
                : "Reading it with AI…"
              : "Tap to choose a photo, or drop one here"}
          </span>
          <span className="text-xs text-muted-foreground">
            {phase === "scanning"
              ? "This usually takes a few seconds."
              : "JPG, PNG or WebP · under 8 MB"}
          </span>
          {busy ? <Progress value={progress} className="max-w-xs" /> : null}
        </label>

        {busy ? null : (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ImagePlus className="size-4" aria-hidden="true" />
            Try to keep the whole bill in frame, flat and well-lit.
          </div>
        )}
      </div>

      {phase === "failed" && error ? (
        <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          {error}{" "}
          {error.includes("limit") ? <Link href="/bills/scan" className="underline underline-offset-4">Back</Link> : null}
        </p>
      ) : null}

      <section className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Recent scans</h2>
        {scans.length === 0 ? (
          <EmptyState
            icon={ReceiptText}
            title="No scans yet"
            description="Every bill you read shows up here so you can double-check the details before it becomes an expense."
          />
        ) : (
          <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {scans.map((scan) => {
              const meta = STATUS_META[scan.status];
              const subtitle = scan.extraction?.merchant
                ? scan.extraction.merchant
                : scan.extraction?.isABill === false
                  ? "Doesn’t look like a bill"
                  : scan.originalFilename ?? "Bill";
              return (
                <li key={scan.id}>
                  <Link
                    href={`/bills/scan/${scan.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/40"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <ReceiptText className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{subtitle}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {formatDateTimeInTimeZone(scan.createdAt, timezone)}
                        {scan.confidence && scan.status === "needs_review"
                          ? ` · ${Math.round(scan.confidence.score * 100)}% confident`
                          : ""}
                      </span>
                    </span>
                    {scan.status === "failed" && scan.errorMessage ? (
                      <span className="hidden max-w-40 truncate text-xs text-muted-foreground sm:block">
                        {scan.errorMessage}
                      </span>
                    ) : null}
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}