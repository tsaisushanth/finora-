import Link from "next/link";
import { AuthShell, FormAlert } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";

function safeNext(value: string | string[] | undefined): string {
  const next = Array.isArray(value) ? value[0] : value;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const authError =
    params.error === "auth"
      ? "We couldn't sign you in. Please try again."
      : undefined;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to keep tracking your money."
      footer={
        <>
          New to Finora?{" "}
          <Link
            href="/signup"
            className="text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </>
      }
    >
      <div className="grid gap-4">
        <FormAlert error={authError} />
        <SignInForm next={safeNext(params.next)} />
      </div>
    </AuthShell>
  );
}