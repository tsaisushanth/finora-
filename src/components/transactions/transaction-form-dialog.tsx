"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createExpenseAction,
  createIncomeAction,
  updateExpenseAction,
} from "@/lib/transactions/actions";
import {
  expenseInputSchema,
  incomeInputSchema,
  type ExpenseInputValues,
  type IncomeInputValues,
} from "@/lib/validations/transactions";
import { nowToDatetimeLocal, toDatetimeLocal } from "@/lib/dates";
import { numericToPaise, paiseToNumeric } from "@/lib/money";
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
import type { TransactionOption, TransactionFormTarget } from "@/components/transactions/types";

const NONE = "__none__";

export function TransactionFormDialog({
  kind,
  open,
  onOpenChange,
  categories,
  paymentMethods,
  timezone,
  editing,
  onSaved,
}: {
  kind: "expense" | "income";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TransactionOption[];
  paymentMethods: TransactionOption[];
  timezone: string;
  editing?: TransactionFormTarget | null;
  onSaved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const isEdit = kind === "expense" && Boolean(editing);
  const s = (value: string | null | undefined, fallback = "") =>
    value && value !== "" ? value : fallback;

  const expenseForm = useForm<ExpenseInputValues>({
    resolver: zodResolver(expenseInputSchema),
    defaultValues: {
      amount: editing ? paiseToNumeric(numericToPaise(editing.amount)) : "",
      categoryId: editing?.categoryId ?? NONE,
      paymentMethodId: editing?.paymentMethodId ?? NONE,
      merchant: editing?.title ?? "",
      note: editing?.note ?? "",
      occurredAt: editing
        ? toDatetimeLocal(editing.occurredAt, timezone)
        : nowToDatetimeLocal(timezone),
    },
  });

  const incomeForm = useForm<IncomeInputValues>({
    resolver: zodResolver(incomeInputSchema),
    defaultValues: {
      amount: "",
      categoryId: NONE,
      source: "",
      note: "",
      occurredAt: nowToDatetimeLocal(timezone),
    },
  });

  const expenseErrors = expenseForm.formState.errors;
  const incomeErrors = incomeForm.formState.errors;

  function submitExpense(values: ExpenseInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("amount", values.amount);
    formData.set("categoryId", values.categoryId && values.categoryId !== NONE ? values.categoryId : "");
    formData.set(
      "paymentMethodId",
      values.paymentMethodId && values.paymentMethodId !== NONE ? values.paymentMethodId : "",
    );
    formData.set("merchant", s(values.merchant));
    formData.set("note", s(values.note));
    formData.set("occurredAt", values.occurredAt);
    if (editing) formData.set("id", editing.id);
    startTransition(async () => {
      const result = editing
        ? await updateExpenseAction(formData)
        : await createExpenseAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Expense saved.");
        onSaved();
      }
    });
  }

  function submitIncome(values: IncomeInputValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("amount", values.amount);
    formData.set("categoryId", values.categoryId && values.categoryId !== NONE ? values.categoryId : "");
    formData.set("source", s(values.source));
    formData.set("note", s(values.note));
    formData.set("occurredAt", values.occurredAt);
    startTransition(async () => {
      const result = await createIncomeAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Income added.");
        onSaved();
      }
    });
  }

  const categoryOptions = [
    { value: NONE, label: "None" },
    ...categories.map((c) => ({ value: c.id, label: c.name })),
  ];
  const paymentOptions = [
    { value: NONE, label: "None" },
    ...paymentMethods.map((p) => ({ value: p.id, label: p.name })),
  ];

  const busy = pending || expenseForm.formState.isSubmitting || incomeForm.formState.isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit expense" : kind === "income" ? "Add income" : "Add expense"}
          </DialogTitle>
          <DialogDescription>
            {kind === "expense"
              ? "Log money you spent. This is debited from your wallet ledger."
              : "Add money that came in — salary, pocket money or refunds."}
          </DialogDescription>
        </DialogHeader>

        <FormAlert error={serverError} />

        {kind === "expense" ? (
          <form onSubmit={expenseForm.handleSubmit(submitExpense)} className="grid gap-4" noValidate>
            <Field label="Amount (₹)" htmlFor="expense-amount" error={expenseErrors.amount?.message}>
              <Input
                id="expense-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="250.00"
                aria-invalid={Boolean(expenseErrors.amount)}
                {...expenseForm.register("amount")}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Controller
                control={expenseForm.control}
                name="categoryId"
                render={({ field }) => (
                  <SelectField
                    label="Category"
                    id="expense-category"
                    error={expenseErrors.categoryId?.message}
                    value={field.value ?? NONE}
                    onValueChange={field.onChange}
                    options={categoryOptions}
                    placeholder="Pick a category"
                  />
                )}
              />
              <Controller
                control={expenseForm.control}
                name="paymentMethodId"
                render={({ field }) => (
                  <SelectField
                    label="Paid by"
                    id="expense-payment"
                    value={field.value ?? NONE}
                    onValueChange={field.onChange}
                    options={paymentOptions}
                    placeholder="None"
                  />
                )}
              />
            </div>

            <Field label="Merchant" htmlFor="expense-merchant" error={expenseErrors.merchant?.message} hint="Optional">
              <Input
                id="expense-merchant"
                autoComplete="off"
                placeholder="Zomato, D-Mart, Metro card…"
                {...expenseForm.register("merchant")}
              />
            </Field>

            <Field label="Note" htmlFor="expense-note" error={expenseErrors.note?.message} hint="Optional">
              <Textarea id="expense-note" placeholder="What was this for?" {...expenseForm.register("note")} />
            </Field>

            <Field label="When" htmlFor="expense-when" error={expenseErrors.occurredAt?.message}>
              <Input
                id="expense-when"
                type="datetime-local"
                aria-invalid={Boolean(expenseErrors.occurredAt)}
                {...expenseForm.register("occurredAt")}
              />
            </Field>

            <DialogFooter className="mt-2">
              <SubmitButton pending={busy}>{isEdit ? "Save changes" : "Add expense"}</SubmitButton>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={incomeForm.handleSubmit(submitIncome)} className="grid gap-4" noValidate>
            <Field label="Amount (₹)" htmlFor="income-amount" error={incomeErrors.amount?.message}>
              <Input
                id="income-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="15000.00"
                aria-invalid={Boolean(incomeErrors.amount)}
                {...incomeForm.register("amount")}
              />
            </Field>

            <Controller
              control={incomeForm.control}
              name="categoryId"
              render={({ field }) => (
                <SelectField
                  label="Category"
                  id="income-category"
                  error={incomeErrors.categoryId?.message}
                  value={field.value ?? NONE}
                  onValueChange={field.onChange}
                  options={categoryOptions}
                  placeholder="Pick a category"
                />
              )}
            />

            <Field label="Source" htmlFor="income-source" error={incomeErrors.source?.message} hint="Optional">
              <Input
                id="income-source"
                autoComplete="off"
                placeholder="Salary, scholarship, cashback…"
                {...incomeForm.register("source")}
              />
            </Field>

            <Field label="Note" htmlFor="income-note" error={incomeErrors.note?.message} hint="Optional">
              <Textarea id="income-note" placeholder="Anything you want to remember." {...incomeForm.register("note")} />
            </Field>

            <Field label="When" htmlFor="income-when" error={incomeErrors.occurredAt?.message}>
              <Input
                id="income-when"
                type="datetime-local"
                aria-invalid={Boolean(incomeErrors.occurredAt)}
                {...incomeForm.register("occurredAt")}
              />
            </Field>

            <DialogFooter className="mt-2">
              <SubmitButton pending={busy}>Add income</SubmitButton>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}