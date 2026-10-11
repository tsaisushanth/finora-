import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getWalletFeed } from "@/lib/transactions/queries";
import { PageHeader } from "@/components/page-header";
import { WalletLedger } from "@/components/wallet/wallet-ledger";
import { WalletOverview } from "@/components/wallet/wallet-overview";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const profile = await requireOnboardedProfile();
  const raw = await searchParams;
  const pageValue = Array.isArray(raw.page) ? raw.page[0] : raw.page;
  const page = Number.parseInt(pageValue ?? "1", 10);
  const feed = await getWalletFeed(profile.id, Number.isFinite(page) && page > 0 ? page : 1);

  return (
    <>
      <PageHeader
        title="Wallet"
        description="Cash, bank and UPI money — the balance is always derived from a ledger, never stored."
      />
      <div className="grid gap-6">
        <WalletOverview balancePaise={feed.balancePaise} stats={feed.stats} />
        <WalletLedger
          entries={feed.entries.map((entry) => ({
            id: entry.id,
            type: entry.type,
            amount: entry.amount,
            note: entry.note,
            occurredAt: entry.occurredAt,
          }))}
          total={feed.total}
          page={feed.page}
          pageCount={feed.pageCount}
          timezone={profile.timezone}
        />
      </div>
    </>
  );
}