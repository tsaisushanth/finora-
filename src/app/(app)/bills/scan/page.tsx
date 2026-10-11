import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { listScans } from "@/lib/bills/queries";
import { PageHeader } from "@/components/page-header";
import { ScanStudio } from "@/components/bills/scan-studio";

export const metadata: Metadata = { title: "Scan a bill" };

export default async function ScanPage() {
  const profile = await requireOnboardedProfile();
  const scans = await listScans(profile.id);

  return (
    <>
      <PageHeader
        title="Scan a bill"
        description="Photograph a bill or receipt and let AI turn it into an expense."
      />
      <ScanStudio scans={scans} timezone={profile.timezone} />
    </>
  );
}