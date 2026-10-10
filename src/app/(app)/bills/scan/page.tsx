import { ScanLine } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Scan a bill" };

const Icon = ScanLine;

export default function scanPage() {
  return (
    <>
      <PageHeader title="Scan a bill" description="Photograph a bill or receipt and let AI turn it into an expense." />
      <EmptyState icon={Icon} title="Bill scanning is coming in Phase 7" description="Upload a receipt and Finora will extract items, amounts and the store automatically." />
    </>
  );
}

