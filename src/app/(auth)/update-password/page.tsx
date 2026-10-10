import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Pick something strong you haven't used before."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}