"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { repayLoanAction } from "@/lib/loans/actions";
import { repayLoanInputSchema, type RepayLoanInputValues } from "@/lib/validations/loans";
import { nowToDatetimeLocal } from "@/lib/dates";
import { formatPaise } from "@/lib/money";
import { Field } from "@/components/forms/field";
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
import type { LoanItem } from "@/lib/loans/queries";

export function RepayLoanDialog({
  loan,
  open,
  onOpenChange,
  timezone,
  onSaved,
}: {
  loan: LoanItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const isReceived = loan?.direction === "lent";
  const outstanding = loan?.outstandingPaise ?? 0;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RepayLoanInputValues>({
    resolver: zodResolver(repayLoanInputSchema),
    defaultValues: {
      loanId: loan?.id ?? "",
      amount: "",
      note: "",
      occurredAt: nowToDatetimeLocal(timezone),
    },
  });

  function onSubmit(values: RepayLoanInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("loanId", loan?.id ?? "");
    formData.set("amount", values.amount);
    formData.set("note", values.note ?? "");
    formData.set("occurredAt", values.occurredAt);
    startTransition(async () => {
      const result = await repayLoanAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Repayment recorded.");
        onSaved();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isReceived ? `Repayment from ${loan?.person}` : `Repay ${loan?.person}`}
          </DialogTitle>
          <DialogDescription>
            {isReceived
              ? "Friends pay you back — this returns money to your wallet."
              : "You settle part of what you borrowed; money comes out of your wallet."}
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <Field
            label="Amount (₹)"
            htmlFor="repay-amount"
            error={errors.amount?.message}
            hint={`Outstanding: ${formatPaise(outstanding)}`}
          >
            <Input
              id="repay-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="1000.00"
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </Field>

          <Field label="Note" htmlFor="repay-note" error={errors.note?.message} hint="Optional">
            <Textarea id="repay-note" placeholder="Partial payment, UPI transfer…" {...register("note")} />
          </Field>

          <Field label="When" htmlFor="repay-when" error={errors.occurredAt?.message}>
            <Input id="repay-when" type="datetime-local" aria-invalid={Boolean(errors.occurredAt)} {...register("occurredAt")} />
          </Field>

          <DialogFooter className="mt-2">
            <SubmitButton pending={pending}>
              {isReceived ? "Record repayment" : "Repay"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}