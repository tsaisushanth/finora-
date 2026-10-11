import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getInsights, sumMonthGoalContributions } from "@/lib/insights/queries";
import { getWalletSummary, listTransactions } from "@/lib/transactions/queries";
import { getGoals } from "@/lib/goals/queries";
import { rupeesToPaise } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const metadata: Metadata = { title: "Overview" };

export default async function DashboardPage() {
  const profile = await requireOnboardedProfile();
  const budgetPaise = rupeesToPaise(profile.monthly_budget);

  const [insights, wallet, recent, goalData] = await Promise.all([
    getInsights(profile.id, profile.timezone, budgetPaise),
    getWalletSummary(profile.id),
    listTransactions(profile.id, { page: 1 }, profile.timezone),
    getGoals(profile.id),
  ]);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Balance, spending and goals — all in one place."
      />
      <DashboardView
        firstName={profile.full_name}
        timezone={profile.timezone}
        data={insights}
        summary={wallet}
        recent={recent.items.slice(0, 5)}
        goals={goalData.goals}
        monthGoalContribPaise={sumMonthGoalContributions(
          goalData.contributions,
          profile.timezone,
        )}
      />
    </>
  );
}