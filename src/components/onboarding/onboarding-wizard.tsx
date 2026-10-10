"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { completeOnboardingAction } from "@/lib/profile/actions";
import {
  occupationLabels,
  occupationValues,
  onboardingSchema,
  type OnboardingValues,
} from "@/lib/validations/profile";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const occupationOptions = occupationValues.map((value) => ({
  value,
  label: occupationLabels[value],
}));

const steps = [
  {
    title: "Tell us about you",
    description: "This personalises your dashboard. Everything is optional except your name.",
    fields: ["full_name", "city", "occupation"],
  },
  {
    title: "Your monthly money",
    description: "Rough numbers are fine — you can change these anytime in settings.",
    fields: ["monthly_income", "monthly_budget"],
  },
  {
    title: "Starting balance",
    description: "How much money do you have right now across cash, bank and UPI?",
    fields: ["opening_balance"],
  },
] as const;

export function OnboardingWizard({ defaultName }: { defaultName: string }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema) as Resolver<OnboardingValues>,
    mode: "onTouched",
    defaultValues: {
      full_name: defaultName,
      occupation: undefined,
      city: "",
      monthly_income: 0,
      monthly_budget: 0,
      opening_balance: 0,
    },
  });

  const isLast = step === steps.length - 1;

  async function goNext() {
    const valid = await trigger(
      steps[step].fields as unknown as (keyof OnboardingValues)[],
    );
    if (valid) setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function onSubmit(values: OnboardingValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("full_name", values.full_name);
    formData.set("occupation", values.occupation ?? "");
    formData.set("city", values.city ?? "");
    formData.set("monthly_income", String(values.monthly_income));
    formData.set("monthly_budget", String(values.monthly_budget));
    formData.set("opening_balance", String(values.opening_balance));
    startTransition(async () => {
      const result = await completeOnboardingAction(formData);
      if (result?.error) setServerError(result.error);
    });
  }

  return (
    <div className="grid gap-6">
      <ol className="flex items-center gap-2" aria-label="Onboarding progress">
        {steps.map((item, index) => (
          <li key={item.title} className="flex flex-1 items-center gap-2">
            <span
              className={
                index <= step
                  ? "h-1.5 flex-1 rounded-full bg-primary"
                  : "h-1.5 flex-1 rounded-full bg-muted"
              }
            />
          </li>
        ))}
      </ol>

      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Step {step + 1} of {steps.length}
        </p>
        <h1 className="font-heading text-xl font-semibold tracking-tight">
          {steps[step].title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {steps[step].description}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <FormAlert error={serverError} />

        {step === 0 ? (
          <>
            <Field label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
              <Input
                id="full_name"
                autoComplete="name"
                aria-invalid={Boolean(errors.full_name)}
                {...register("full_name")}
              />
            </Field>

            <Field label="City" htmlFor="city" error={errors.city?.message} hint="Optional">
              <Input id="city" placeholder="Bengaluru" {...register("city")} />
            </Field>

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
                />
              )}
            />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Field
              label="Monthly income"
              htmlFor="monthly_income"
              error={errors.monthly_income?.message}
              hint="In rupees (₹)."
            >
              <Input
                id="monthly_income"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                aria-invalid={Boolean(errors.monthly_income)}
                {...register("monthly_income")}
              />
            </Field>

            <Field
              label="Monthly budget"
              htmlFor="monthly_budget"
              error={errors.monthly_budget?.message}
              hint="The most you'd like to spend each month."
            >
              <Input
                id="monthly_budget"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                aria-invalid={Boolean(errors.monthly_budget)}
                {...register("monthly_budget")}
              />
            </Field>
          </>
        ) : null}

        {step === 2 ? (
          <Field
            label="Current total balance"
            htmlFor="opening_balance"
            error={errors.opening_balance?.message}
            hint="This becomes your wallet's opening balance."
          >
            <Input
              id="opening_balance"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              aria-invalid={Boolean(errors.opening_balance)}
              {...register("opening_balance")}
            />
          </Field>
        ) : null}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep((current) => Math.max(current - 1, 0))}
            disabled={step === 0 || pending}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </Button>

          {isLast ? (
            <SubmitButton pending={pending}>
              Finish setup
            </SubmitButton>
          ) : (
            <Button type="button" onClick={goNext}>
              Next
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}