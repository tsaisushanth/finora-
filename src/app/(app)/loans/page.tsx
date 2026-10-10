import { HandCoins } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Loans" };

const Icon = HandCoins;

export default function loansPage() {
  return (
    <>
      <PageHeader title="Loans" description="Money lent to or borrowed from friends, with repayments tracked." />
      <EmptyState icon={Icon} title="No loans yet" description="Lend / borrow tracking arrives in Phase 5." />
    </>
  );
}

