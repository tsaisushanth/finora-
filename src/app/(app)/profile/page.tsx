import { PageHeader } from "@/components/page-header";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ProfileDetailsForm } from "@/components/profile/profile-details-form";
import { PreferencesForm } from "@/components/profile/preferences-form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/profile/avatar";
import {
  occupationValues,
  type Occupation,
} from "@/lib/validations/profile";

function asOccupation(value: string | null): Occupation | undefined {
  return value && (occupationValues as readonly string[]).includes(value)
    ? (value as Occupation)
    : undefined;
}

export default async function ProfilePage() {
  const profile = await requireOnboardedProfile();
  const avatarUrl = await getAvatarUrl(profile.avatar_url);

  return (
    <>
      <PageHeader
        title="Profile"
        description="Manage your personal details and how Finora behaves."
      />

      <Tabs defaultValue="profile" className="gap-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="grid gap-6">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <AvatarUpload
              name={profile.full_name ?? "Friend"}
              avatarUrl={avatarUrl}
            />
          </div>
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <ProfileDetailsForm
              defaults={{
                full_name: profile.full_name ?? "",
                username: profile.username ?? "",
                phone: profile.phone ?? "",
                date_of_birth: profile.date_of_birth ?? "",
                occupation: asOccupation(profile.occupation),
                city: profile.city ?? "",
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="preferences">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <PreferencesForm
              defaults={{
                monthly_income: profile.monthly_income,
                monthly_budget: profile.monthly_budget,
                savings_target_percent: profile.savings_target_percent,
                week_start_day: profile.week_start_day,
                timezone: profile.timezone,
                notify_email: profile.notify_email,
                notify_budget_alerts: profile.notify_budget_alerts,
                notify_bill_reminders: profile.notify_bill_reminders,
              }}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}