import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getInsights, sumMonthGoalContributions } from "@/lib/insights/queries";
import { getGoals } from "@/lib/goals/queries";
import { rupeesToPaise } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { InsightsView } from "@/components/insights/insights-view";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const profile = await requireOnboardedProfile();
  const budgetPaise = rupeesToPaise(profile.monthly_budget);

  const [insights, goalData] = await Promise.all([
    getInsights(profile.id, profile.timezone, budgetPaise),
    getGoals(profile.id),
  ]);
  const monthGoalContribPaise = sumMonthGoalContributions(
    goalData.contributions,
    profile.timezone,
  );

  return (
    <>
      <PageHeader
        title="Insights"
        description="Spending by category, month-over-month trends and plain-language notes about your money."
      />
      <InsightsView
        data={insights}
        goals={goalData.goals}
        monthGoalContribPaise={monthGoalContribPaise}
      />
    </>
  );
}