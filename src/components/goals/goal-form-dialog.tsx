"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { createGoalAction, updateGoalAction } from "@/lib/goals/actions";
import { goalInputSchema, type GoalInputValues } from "@/lib/validations/goals";
import { paiseToNumeric } from "@/lib/money";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { GoalItem } from "@/lib/goals/queries";

const NONE = "__none__";

const priorityOptions = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

export function GoalFormDialog({
  open,
  onOpenChange,
  categories,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; name: string; color: string | null }[];
  editing?: GoalItem | null;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GoalInputValues>({
    resolver: zodResolver(goalInputSchema),
    defaultValues: {
      name: editing?.name ?? "",
      targetAmount: editing ? paiseToNumeric(editing.targetPaise) : "",
      categoryId: editing?.categoryId ?? NONE,
      priority: editing?.priority ?? "medium",
      targetDate: editing?.targetDate ?? "",
      description: editing?.description ?? "",
    },
  });

  function onSubmit(values: GoalInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("targetAmount", values.targetAmount);
    formData.set("categoryId", values.categoryId && values.categoryId !== NONE ? values.categoryId : "");
    formData.set("priority", values.priority);
    formData.set("targetDate", values.targetDate ?? "");
    formData.set("description", values.description ?? "");
    if (editing) formData.set("id", editing.id);
    startTransition(async () => {
      const result = editing ? await updateGoalAction(formData) : await createGoalAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? (editing ? "Goal updated." : "Goal created."));
        onSaved();
      }
    });
  }

  const categoryOptions = [
    { value: NONE, label: "None" },
    ...categories.map((category) => ({ value: category.id, label: category.name })),
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            Pick a target and give it a deadline — money you save sits safely in your wallet until you
            add it here.
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field label="Goal name" htmlFor="goal-name" error={errors.name?.message}>
            <Input
              id="goal-name"
              autoComplete="off"
              placeholder="Trip to Goa, new phone…"
              aria-invalid={Boolean(errors.name)}
              {...register("name")}
            />
          </Field>

          <Field label="Target amount (₹)" htmlFor="goal-target" error={errors.targetAmount?.message} hint="How much you want to have saved.">
            <Input
              id="goal-target"
              inputMode="decimal"
              autoComplete="off"
              placeholder="25000.00"
              aria-invalid={Boolean(errors.targetAmount)}
              {...register("targetAmount")}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <SelectField
                  label="Priority"
                  id="goal-priority"
                  value={field.value}
                  onValueChange={field.onChange}
                  options={priorityOptions}
                />
              )}
            />
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SelectField
                  label="Category"
                  id="goal-category"
                  error={errors.categoryId?.message}
                  value={field.value ?? NONE}
                  onValueChange={field.onChange}
                  options={categoryOptions}
                  placeholder="Pick a category"
                />
              )}
            />
          </div>

          <Field label="Target date" htmlFor="goal-date" error={errors.targetDate?.message} hint="Optional — used to estimate how much to save per month.">
            <Input id="goal-date" type="date" aria-invalid={Boolean(errors.targetDate)} {...register("targetDate")} />
          </Field>

          <Field label="Description" htmlFor="goal-description" error={errors.description?.message} hint="Optional">
            <Textarea id="goal-description" placeholder="Why are you saving for this?" {...register("description")} />
          </Field>

          <DialogFooter className="mt-2">
            <SubmitButton pending={pending}>{editing ? "Save changes" : "Create goal"}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}