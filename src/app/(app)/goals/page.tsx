import { Target } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Goals" };

const Icon = Target;

export default function goalsPage() {
  return (
    <>
      <PageHeader title="Goals" description="Save for the trip, gadget or fund — track progress against what you stash away." />
      <EmptyState icon={Icon} title="No goals yet" description="Goal creation and progress tracking arrive in Phase 5." />
    </>
  );
}

