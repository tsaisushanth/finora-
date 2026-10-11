import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getGoals, getGoalCategories } from "@/lib/goals/queries";
import { PageHeader } from "@/components/page-header";
import { GoalLinks } from "@/components/goals/goal-links";
import { GoalsView } from "@/components/goals/goals-view";

export const metadata: Metadata = { title: "Goals" };

export default async function GoalsPage() {
  const profile = await requireOnboardedProfile();
  const [{ goals }, categories] = await Promise.all([
    getGoals(profile.id),
    getGoalCategories(profile.id),
  ]);

  return (
    <>
      <PageHeader
        title="Goals"
        description="Save for the trip, gadget or fund — money you add is tracked against a target, straight from your wallet."
      >
        <GoalLinks />
      </PageHeader>
      <GoalsView goals={goals} categories={categories} timezone={profile.timezone} />
    </>
  );
}