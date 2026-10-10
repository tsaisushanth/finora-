"use client";

import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updatePreferencesAction } from "@/lib/profile/actions";
import { listTimeZones } from "@/lib/dates";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  preferencesSchema,
  type PreferencesValues,
} from "@/lib/validations/profile";

const weekdayOptions = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

function buildTimezoneOptions(current: string) {
  const zones = listTimeZones();
  const all = zones.includes(current) ? zones : [current, ...zones];
  return all.map((value) => ({ value, label: value.replace(/_/g, " ") }));
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="grid gap-0.5">
        <Label htmlFor={id}>{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function PreferencesForm({
  defaults,
}: {
  defaults: PreferencesValues & {
    notify_email: boolean;
    notify_budget_alerts: boolean;
    notify_bill_reminders: boolean;
  };
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [notifyEmail, setNotifyEmail] = useState(defaults.notify_email);
  const [notifyBudget, setNotifyBudget] = useState(defaults.notify_budget_alerts);
  const [notifyBills, setNotifyBills] = useState(defaults.notify_bill_reminders);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PreferencesValues>({
    resolver: zodResolver(preferencesSchema) as Resolver<PreferencesValues>,
    defaultValues: {
      monthly_income: defaults.monthly_income,
      monthly_budget: defaults.monthly_budget,
      savings_target_percent: defaults.savings_target_percent,
      week_start_day: defaults.week_start_day,
      timezone: defaults.timezone,
    },
  });

  const timezoneOptions = buildTimezoneOptions(defaults.timezone);

  function onSubmit(values: PreferencesValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("monthly_income", String(values.monthly_income));
    formData.set("monthly_budget", String(values.monthly_budget));
    formData.set("savings_target_percent", String(values.savings_target_percent));
    formData.set("week_start_day", String(values.week_start_day));
    formData.set("timezone", values.timezone);
    if (notifyEmail) formData.set("notify_email", "on");
    if (notifyBudget) formData.set("notify_budget_alerts", "on");
    if (notifyBills) formData.set("notify_bill_reminders", "on");
    startTransition(async () => {
      const result = await updatePreferencesAction(formData);
      if (result?.error) setServerError(result.error);
      else if (result?.success) toast.success(result.success);
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
      <FormAlert error={serverError} />

      <div className="grid gap-4 sm:grid-cols-2">
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
          hint="In rupees (₹)."
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
      </div>

      <Field
        label="Savings target"
        htmlFor="savings_target_percent"
        error={errors.savings_target_percent?.message}
        hint="Percentage of income you aim to save each month."
      >
        <Input
          id="savings_target_percent"
          type="number"
          min={0}
          max={100}
          step="1"
          inputMode="decimal"
          aria-invalid={Boolean(errors.savings_target_percent)}
          {...register("savings_target_percent")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          control={control}
          name="week_start_day"
          render={({ field }) => (
            <SelectField
              label="Week starts on"
              id="week_start_day"
              error={errors.week_start_day?.message}
              value={String(field.value)}
              onValueChange={(value) => field.onChange(Number(value))}
              options={weekdayOptions}
            />
          )}
        />

        <Controller
          control={control}
          name="timezone"
          render={({ field }) => (
            <SelectField
              label="Timezone"
              id="timezone"
              error={errors.timezone?.message}
              value={field.value}
              onValueChange={field.onChange}
              options={timezoneOptions}
            />
          )}
        />
      </div>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium">Notifications</h2>
        <ToggleRow
          id="notify_email"
          label="Email updates"
          description="Account and monthly summary emails."
          checked={notifyEmail}
          onCheckedChange={setNotifyEmail}
        />
        <ToggleRow
          id="notify_budget_alerts"
          label="Budget alerts"
          description="Nudge me when I am close to my budget."
          checked={notifyBudget}
          onCheckedChange={setNotifyBudget}
        />
        <ToggleRow
          id="notify_bill_reminders"
          label="Bill reminders"
          description="Remind me before recurring bills are due."
          checked={notifyBills}
          onCheckedChange={setNotifyBills}
        />
      </div>

      <SubmitButton pending={pending || isSubmitting} className="justify-self-start">
        Save preferences
      </SubmitButton>
    </form>
  );
}