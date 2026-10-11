import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getLoans } from "@/lib/loans/queries";
import { PageHeader } from "@/components/page-header";
import { LoanLinks } from "@/components/loans/loan-links";
import { LoansView } from "@/components/loans/loans-view";

export const metadata: Metadata = { title: "Loans" };

export default async function LoansPage() {
  const profile = await requireOnboardedProfile();
  const { loans } = await getLoans(profile.id);

  return (
    <>
      <PageHeader
        title="Loans"
        description="Money lent to or borrowed from friends, with each repayment tracked against the loan."
      >
        <LoanLinks />
      </PageHeader>
      <LoansView loans={loans} timezone={profile.timezone} />
    </>
  );
}