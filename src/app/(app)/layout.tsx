import { AppShell } from "@/components/shell/app-shell";
import {
  getCurrentUser,
  requireOnboardedProfile,
} from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/profile/avatar";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [profile, user] = await Promise.all([
    requireOnboardedProfile(),
    getCurrentUser(),
  ]);
  const avatarUrl = await getAvatarUrl(profile.avatar_url);

  return (
    <AppShell
      user={{
        name: profile.full_name ?? "Friend",
        email: user?.email ?? "",
        avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}