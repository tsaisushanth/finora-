import { ChartPie } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Insights" };

const Icon = ChartPie;

export default function insightsPage() {
  return (
    <>
      <PageHeader title="Insights" description="Spending by category, month-over-month trends and non-essential analysis." />
      <EmptyState icon={Icon} title="No insights yet" description="Charts and breakdowns land in Phase 6, once there is real data." />
    </>
  );
}

