import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getBill } from "@/lib/bills/queries";
import { getTransactionOptions } from "@/lib/transactions/queries";
import { PageHeader } from "@/components/page-header";
import { ScanReview } from "@/components/bills/scan-review";

export const metadata: Metadata = { title: "Review scan" };

export default async function ScanReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireOnboardedProfile();
  const [bill, options] = await Promise.all([
    getBill(profile.id, id),
    getTransactionOptions(profile.id),
  ]);
  if (!bill) notFound();

  return (
    <>
      <PageHeader
        title="Review scan"
        description="Check what the AI read, fix anything, then confirm it as an expense."
      />
      <ScanReview
        timezone={profile.timezone}
        bill={bill.bill}
        signedUrl={bill.signedUrl}
        categories={options.categories}
        paymentMethods={options.paymentMethods}
      />
    </>
  );
}