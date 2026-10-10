"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileDetailsAction } from "@/lib/profile/actions";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import {
  occupationLabels,
  occupationValues,
  profileDetailsSchema,
  type ProfileDetailsValues,
} from "@/lib/validations/profile";

const occupationOptions = occupationValues.map((value) => ({
  value,
  label: occupationLabels[value],
}));

export function ProfileDetailsForm({
  defaults,
}: {
  defaults: ProfileDetailsValues;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileDetailsValues>({
    resolver: zodResolver(profileDetailsSchema),
    defaultValues: defaults,
  });

  function onSubmit(values: ProfileDetailsValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("full_name", values.full_name);
    formData.set("username", values.username ?? "");
    formData.set("phone", values.phone ?? "");
    formData.set("date_of_birth", values.date_of_birth ?? "");
    formData.set("occupation", values.occupation ?? "");
    formData.set("city", values.city ?? "");
    startTransition(async () => {
      const result = await updateProfileDetailsAction(formData);
      if (result?.error) setServerError(result.error);
      else if (result?.success) toast.success(result.success);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormAlert error={serverError} />

      <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
        <Input
          id="full_name"
          autoComplete="name"
          aria-invalid={Boolean(errors.full_name)}
          {...register("full_name")}
        />
      </Field>

      <Field
        label="Username"
        htmlFor="username"
        error={errors.username?.message}
        hint="Letters, numbers and underscore. Shown on your profile."
      >
        <Input id="username" {...register("username")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone" error={errors.phone?.message} hint="Optional">
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+91 98765 43210"
            {...register("phone")}
          />
        </Field>

        <Field
          label="Date of birth"
          htmlFor="date_of_birth"
          error={errors.date_of_birth?.message}
          hint="Optional"
        >
          <Input id="date_of_birth" type="date" {...register("date_of_birth")} />
        </Field>
      </div>

      <Controller
        control={control}
        name="occupation"
        render={({ field }) => (
          <SelectField
            label="I am a"
            id="occupation"
            error={errors.occupation?.message}
            value={field.value ?? ""}
            onValueChange={field.onChange}
            options={occupationOptions}
            placeholder="Choose one"
          />
        )}
      />

      <Field label="City" htmlFor="city" error={errors.city?.message} hint="Optional">
        <Input id="city" placeholder="Bengaluru" {...register("city")} />
      </Field>

      <SubmitButton pending={pending || isSubmitting} className="justify-self-start">
        Save profile
      </SubmitButton>
    </form>
  );
}