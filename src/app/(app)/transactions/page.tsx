import { ArrowLeftRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Transactions" };

const Icon = ArrowLeftRight;

export default function transactionsPage() {
  return (
    <>
      <PageHeader title="Transactions" description="Every expense, income and goal contribution, in one chronological list." />
      <EmptyState icon={Icon} title="No transactions yet" description="Expense entry and the full ledger view land in Phase 4." />
    </>
  );
}

