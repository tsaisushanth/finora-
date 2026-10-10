import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wallet" };

export default function WalletPage() {
  return (
    <>
      <PageHeader
        title="Wallet"
        description="Cash, bank and UPI money — the balance is always derived from a ledger, never stored."
      />
      <EmptyState
        icon={Wallet}
        title="No wallet yet"
        description="Ledger transfers arrive in Phase 4. Your balance will be computed from real transactions."
      />
    </>
  );
}