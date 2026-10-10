"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpAction } from "@/lib/auth/actions";
import { signUpSchema, type SignUpValues } from "@/lib/validations/auth";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";

export function SignUpForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [serverSuccess, setServerSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  function onSubmit(values: SignUpValues) {
    setServerError(null);
    setServerSuccess(null);
    const formData = new FormData();
    formData.set("fullName", values.fullName);
    formData.set("email", values.email);
    formData.set("password", values.password);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result?.error) {
        setServerError(result.error);
      } else if (result?.success) {
        setServerSuccess(result.success);
        reset();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormAlert error={serverError} success={serverSuccess} />

      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input
          id="fullName"
          autoComplete="name"
          placeholder="Aditi Sharma"
          aria-invalid={Boolean(errors.fullName)}
          {...register("fullName")}
        />
      </Field>

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

      <Field
        label="Password"
        htmlFor="password"
        error={errors.password?.message}
        hint="At least 8 characters."
      >
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <SubmitButton pending={pending || isSubmitting} className="w-full">
        Create account
      </SubmitButton>
    </form>
  );
}