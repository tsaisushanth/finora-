"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInAction, signInWithGoogleAction } from "@/lib/auth/actions";
import { signInSchema, type SignInValues } from "@/lib/validations/auth";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SignInForm({ next }: { next: string }) {
  const [pending, startTransition] = useTransition();
  const [googlePending, startGoogle] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  function onSubmit(values: SignInValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("next", next);
    startTransition(async () => {
      const result = await signInAction(formData);
      if (result?.error) setServerError(result.error);
    });
  }

  function onGoogle() {
    setServerError(null);
    startGoogle(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) setServerError(result.error);
    });
  }

  const busy = pending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormAlert error={serverError} />

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(errors.email)}
          {...register("email")}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <div className="flex justify-end">
        <Link
          href="/reset-password"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      <SubmitButton pending={busy} className="w-full">
        Sign in
      </SubmitButton>

      <div className="relative py-1 text-center">
        <span className="relative z-10 bg-card px-2 text-xs text-muted-foreground">
          or
        </span>
        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={onGoogle}
        disabled={googlePending}
      >
        Continue with Google
      </Button>
    </form>
  );
}