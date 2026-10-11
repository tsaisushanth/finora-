"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { adjustBalanceAction } from "@/lib/transactions/actions";
import {
  adjustBalanceInputSchema,
  type AdjustBalanceInputValues,
} from "@/lib/validations/transactions";
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

export function AdjustBalanceDialog({
  open,
  defaultMode,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  defaultMode: "add" | "remove";
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [mode, setMode] = useState<"add" | "remove">(defaultMode);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AdjustBalanceInputValues>({
    resolver: zodResolver(adjustBalanceInputSchema),
    defaultValues: { mode: defaultMode, amount: "", reason: "" },
  });

  function onSubmit(values: AdjustBalanceInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("mode", values.mode);
    formData.set("amount", values.amount);
    formData.set("reason", values.reason);
    startTransition(async () => {
      const result = await adjustBalanceAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Wallet updated.");
        onSaved();
      }
    });
  }

  const busy = pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "remove" ? "Remove money" : "Add money"}</DialogTitle>
          <DialogDescription>
            This writes a signed entry to your wallet ledger with a reason. No stored balance is edited.
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Add or remove money">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              onClick={() => {
                setMode("add");
                setValue("mode", "add");
              }}
              className={cn(mode === "add" && "border-primary")}
            >
              <ArrowDownCircle className="size-4" aria-hidden="true" />
              Add money
            </Button>
            <Button
              type="button"
              variant={mode === "remove" ? "default" : "outline"}
              onClick={() => {
                setMode("remove");
                setValue("mode", "remove");
              }}
            >
              <ArrowUpCircle className="size-4" aria-hidden="true" />
              Remove money
            </Button>
          </div>

          <Field label="Amount (₹)" htmlFor="adjust-amount" error={errors.amount?.message}>
            <Input
              id="adjust-amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder={mode === "remove" ? "500.00" : "2000.00"}
              aria-invalid={Boolean(errors.amount)}
              {...register("amount")}
            />
          </Field>

          <Field
            label="Reason"
            htmlFor="adjust-reason"
            error={errors.reason?.message}
            hint="Required — keeps your audit trail honest."
          >
            <Textarea
              id="adjust-reason"
              placeholder="ATM withdrawal, cash found, UPI cashback…"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
          </Field>

          <DialogFooter className="mt-2">
            <SubmitButton pending={busy}>
              {mode === "remove" ? "Remove money" : "Add money"}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}