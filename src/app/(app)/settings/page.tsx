import { Settings } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

const Icon = Settings;

export default function settingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Profile details, currency defaults and app preferences." />
      <EmptyState icon={Icon} title="Settings are coming soon" description="Profile editing and preferences arrive in Phase 3." />
    </>
  );
}

