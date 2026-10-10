import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { getProfile, requireUser } from "@/lib/auth/session";

export default async function OnboardingPage() {
  const user = await requireUser();
  const profile = await getProfile();
  if (profile?.onboarding_completed_at) redirect("/");

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-6 px-4 py-10">
      <div className="flex justify-center">
        <Brand />
      </div>
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <OnboardingWizard defaultName={profile?.full_name ?? metadataName} />
      </div>
    </div>
  );
}