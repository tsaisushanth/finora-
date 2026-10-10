import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="We'll email you a secure link to choose a new password."
      footer={
        <Link
          href="/login"
          className="text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}