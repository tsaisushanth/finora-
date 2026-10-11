"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { contributeToGoalAction, withdrawFromGoalAction } from "@/lib/goals/actions";
import { goalMoneyInputSchema, type GoalMoneyInputValues } from "@/lib/validations/goals";
import { formatPaise } from "@/lib/money";
import { nowToDatetimeLocal } from "@/lib/dates";
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

export type GoalMoneyOptions = { id: string; name: string; availablePaise: number }[];

export function GoalMoneyDialog({
  kind,
  open,
  onOpenChange,
  goals,
  preselectGoalId,
  timezone,
  onSaved,
}: {
  kind: "contribution" | "withdrawal";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: GoalItem[];
  preselectGoalId?: string | null;
  timezone: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const options: GoalMoneyOptions = goals
    .map((goal) => ({
      id: goal.id,
      name: goal.name,
      availablePaise: kind === "contribution" ? goal.remainingPaise : goal.savedPaise,
    }))
    .filter((option) => option.availablePaise > 0);

  const initial = preselectGoalId && options.some((o) => o.id === preselectGoalId) ? preselectGoalId : options[0]?.id ?? "";
  const [selected, setSelected] = useState(initial);

  const selectedGoal = goals.find((goal) => goal.id === selected) ?? null;
  const availablePaise = selectedGoal
    ? kind === "contribution"
      ? selectedGoal.remainingPaise
      : selectedGoal.savedPaise
    : 0;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GoalMoneyInputValues>({
    resolver: zodResolver(goalMoneyInputSchema),
    defaultValues: {
      goalId: initial,
      amount: "",
      note: "",
      occurredAt: nowToDatetimeLocal(timezone),
    },
  });

  function onSubmit(values: GoalMoneyInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("goalId", values.goalId);
    formData.set("amount", values.amount);
    formData.set("note", values.note ?? "");
    formData.set("occurredAt", values.occurredAt);
    startTransition(async () => {
      const result =
        kind === "contribution"
          ? await contributeToGoalAction(formData)
          : await withdrawFromGoalAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? (kind === "contribution" ? "Money moved to goal." : "Money returned to wallet."));
        onSaved();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {kind === "contribution" ? "Add money to a goal" : "Withdraw from a goal"}
          </DialogTitle>
          <DialogDescription>
            {kind === "contribution"
              ? "Moves money from your wallet into the goal — it still stays in the wallet ledger."
              : "Takes saved money back into your available wallet balance."}
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Controller
            control={control}
            name="goalId"
            render={({ field }) => (
              <SelectField
                label="Goal"
                id="money-goal"
                error={errors.goalId?.message}
                value={field.value}
                onValueChange={(next) => {
                  field.onChange(next);
                  setSelected(next);
                }}
                options={options.map((option) => ({
                  value: option.id,
                  label: `${option.name} · ${formatPaise(option.availablePaise)}${kind === "contribution" ? " left" : " saved"}`,
                }))}
                placeholder="Pick a goal"
              />
            )}
          />

          <Field
            label="Amount (₹)"
            htmlFor="money-amount"
            error={errors.amount?.message}
            hint={selectedGoal ? `Available: ${formatPaise(availablePaise)}` : undefined}
          >
            <Input
              id="money-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1000.00"
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </Field>

          <Field label="Note" htmlFor="money-note" error={errors.note?.message} hint="Optional">
            <Textarea id="money-note" placeholder="Anything to remember." {...register("note")} />
          </Field>

          <Field label="When" htmlFor="money-when" error={errors.occurredAt?.message}>
            <Input id="money-when" type="datetime-local" aria-invalid={Boolean(errors.occurredAt)} {...register("occurredAt")} />
          </Field>

          <DialogFooter className="mt-2">
            <SubmitButton pending={pending}>
              {kind === "contribution" ? "Add money" : "Withdraw"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}