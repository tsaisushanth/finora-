"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordAction } from "@/lib/auth/actions";
import {
  updatePasswordSchema,
  type UpdatePasswordValues,
} from "@/lib/validations/auth";
import { Field } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  function onSubmit(values: UpdatePasswordValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("password", values.password);
    formData.set("confirm", values.confirm);
    startTransition(async () => {
      const result = await updatePasswordAction(formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormAlert error={serverError} />

      <Field label="New password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.password)}
          {...register("password")}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirm"
        error={errors.confirm?.message}
      >
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          aria-invalid={Boolean(errors.confirm)}
          {...register("confirm")}
        />
      </Field>

      <SubmitButton pending={pending || isSubmitting} className="w-full">
        Update password
      </SubmitButton>
    </form>
  );
}