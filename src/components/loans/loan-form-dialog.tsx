"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { recordLoanAction } from "@/lib/loans/actions";
import { loanInputSchema, type LoanInputValues } from "@/lib/validations/loans";
import { nowToDatetimeLocal } from "@/lib/dates";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LoanFormDialog({
  open,
  onOpenChange,
  timezone,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  timezone: string;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [direction, setDirection] = useState<"lent" | "borrowed">("lent");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoanInputValues>({
    resolver: zodResolver(loanInputSchema),
    defaultValues: {
      direction: "lent",
      person: "",
      principal: "",
      dueDate: "",
      note: "",
      occurredAt: nowToDatetimeLocal(timezone),
    },
  });

  function onSubmit(values: LoanInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("direction", values.direction);
    formData.set("person", values.person);
    formData.set("principal", values.principal);
    formData.set("dueDate", values.dueDate ?? "");
    formData.set("note", values.note ?? "");
    formData.set("occurredAt", values.occurredAt);
    startTransition(async () => {
      const result = await recordLoanAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Loan recorded.");
        onSaved();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a loan</DialogTitle>
          <DialogDescription>
            Money lent to or borrowed from friends. Principal hits your wallet ledger once; repayments
            move it back.
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Lent or borrowed">
            <Button
              type="button"
              variant={direction === "lent" ? "default" : "outline"}
              onClick={() => {
                setDirection("lent");
                setValue("direction", "lent");
              }}
              className={cn(direction === "lent" && "border-primary")}
            >
              <ArrowUpRight className="size-4" aria-hidden="true" />
              I lent money
            </Button>
            <Button
              type="button"
              variant={direction === "borrowed" ? "default" : "outline"}
              onClick={() => {
                setDirection("borrowed");
                setValue("direction", "borrowed");
              }}
              className={cn(direction === "borrowed" && "border-primary")}
            >
              <ArrowDownLeft className="size-4" aria-hidden="true" />
              I borrowed
            </Button>
          </div>

          <Field label="Person" htmlFor="loan-person" error={errors.person?.message}>
            <Input
              id="loan-person"
              autoComplete="off"
              placeholder="Rahul, Priya, Roommate…"
              aria-invalid={Boolean(errors.person)}
              {...register("person")}
            />
          </Field>

          <Field
            label={direction === "lent" ? "Amount lent (₹)" : "Amount borrowed (₹)"}
            htmlFor="loan-principal"
            error={errors.principal?.message}
            hint={direction === "borrowed" ? "You receive this in your wallet." : "This leaves your wallet when you dish it out."}
          >
            <Input
              id="loan-principal"
              inputMode="decimal"
              autoComplete="off"
              placeholder="5000.00"
              aria-invalid={Boolean(errors.principal)}
              {...register("principal")}
            />
          </Field>

          <Field label="Due date" htmlFor="loan-due" error={errors.dueDate?.message} hint="Optional">
            <Input id="loan-due" type="date" aria-invalid={Boolean(errors.dueDate)} {...register("dueDate")} />
          </Field>

          <Field label="Note" htmlFor="loan-note" error={errors.note?.message} hint="Optional">
            <Textarea id="loan-note" placeholder="Chai-biscuit promised as interest…" {...register("note")} />
          </Field>

          <Field label="When" htmlFor="loan-when" error={errors.occurredAt?.message}>
            <Input id="loan-when" type="datetime-local" aria-invalid={Boolean(errors.occurredAt)} {...register("occurredAt")} />
          </Field>

          <DialogFooter className="mt-2">
            <SubmitButton pending={pending}>
              {direction === "lent" ? "Record loan" : "Record borrowing"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}