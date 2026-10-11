"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Loader2, ReceiptText, ShieldAlert, Trash2 } from "lucide-react";
import {
  confirmBillAction,
  discardBillAction,
} from "@/lib/bills/actions";
import { moneyInput, occurredAtInput } from "@/lib/validations/common";
import { nowToDatetimeLocal, toDatetimeLocal } from "@/lib/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { FormAlert } from "@/components/auth/auth-shell";
import { Money } from "@/components/shared/money";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  CategoryOption,
  PaymentMethodOption,
} from "@/lib/transactions/queries";
import type { Scan } from "@/lib/bills/queries";
import type { AiBillItem } from "@/lib/ai/schema";

const NONE = "__none__";

const reviewFormSchema = z.object({
  amount: moneyInput,
  categoryId: z.string().min(1),
  paymentMethodId: z.string().min(1),
  merchant: z.string(),
  note: z.string(),
  occurredAt: occurredAtInput,
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

function toNumericString(value: number | string | undefined): string {
  if (value === undefined || value === "" || value === null) return "";
  const parsed = typeof value === "number" ? value : Number.parseFloat(value);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function lineItemAmountPaise(item: AiBillItem): number | null {
  if (item.amount !== undefined && item.amount !== "") {
    const parsed = Number(item.amount);
    if (Number.isFinite(parsed)) return Math.round(parsed * 100);
  }
  if (item.unitPrice !== undefined && item.quantity !== undefined) {
    const price = Number(item.unitPrice);
    const quantity = Number(item.quantity);
    if (Number.isFinite(price) && Number.isFinite(quantity) && price > 0 && quantity > 0) {
      return Math.round(price * quantity * 100);
    }
  }
  return null;
}

export function ScanReview({
  timezone,
  bill,
  signedUrl,
  categories,
  paymentMethods,
}: {
  timezone: string;
  bill: Scan;
  signedUrl: string | null;
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);

  const extraction = bill.extraction;
  const lineItems = extraction?.items ?? [];
  const itemsJson = JSON.stringify(
    lineItems.map((item) => ({
      description: item.description ?? "",
      quantity: toNumericString(item.quantity),
      unitPrice: toNumericString(item.unitPrice),
      amount: toNumericString(item.amount),
      suggestedCategory: item.suggestedCategory ?? "",
    })),
  );

  const defaultDate =
    extraction?.date && /^\d{4}-\d{2}-\d{2}$/.test(extraction.date)
      ? toDatetimeLocal(new Date(`${extraction.date}T12:00:00`).toISOString(), timezone)
      : nowToDatetimeLocal(timezone);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      amount: extraction && extraction.total > 0 ? extraction.total.toFixed(2) : "",
      categoryId: NONE,
      paymentMethodId: NONE,
      merchant: extraction?.merchant ?? "",
      note: "",
      occurredAt: defaultDate,
    },
  });
  const formErrors = form.formState.errors;

  function submit(values: ReviewFormValues) {
    setServerError(null);
    const formData = new FormData();
    formData.set("billId", bill.id);
    formData.set("amount", values.amount);
    formData.set("categoryId", values.categoryId && values.categoryId !== NONE ? values.categoryId : "");
    formData.set("paymentMethodId", values.paymentMethodId && values.paymentMethodId !== NONE ? values.paymentMethodId : "");
    formData.set("merchant", values.merchant);
    formData.set("note", values.note);
    formData.set("occurredAt", values.occurredAt);
    formData.set("items", itemsJson);
    startTransition(async () => {
      const result = await confirmBillAction(formData);
      if (result?.error) setServerError(result.error);
      else {
        toast.success(result.success ?? "Expense created.");
        router.push("/transactions");
      }
    });
  }

  function discard() {
    setDiscardOpen(false);
    const formData = new FormData();
    formData.set("billId", bill.id);
    startTransition(async () => {
      const result = await discardBillAction(formData);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(result.success ?? "Bill discarded.");
        router.push("/bills/scan");
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

  const busy = pending || form.formState.isSubmitting;

  return (
    <div className="grid gap-6">
      {bill.status === "confirmed" ? (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 p-5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="flex-1 text-sm">
              This scan is already an expense.{" "}
              <Link href="/transactions" className="text-primary underline-offset-4 hover:underline">
                View it in transactions
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : bill.status === "discarded" ? (
        <Card className="border-border bg-muted/40">
          <CardContent className="flex items-center gap-3 p-5">
            <p className="flex-1 text-sm">This scan was discarded and is not an expense.</p>
            <Button size="sm" variant="outline" render={<Link href="/bills/scan" prefetch={false} />}>
              Back to scans
            </Button>
          </CardContent>
        </Card>
      ) : bill.status === "failed" ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-5">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium">This scan failed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {bill.errorMessage ?? "The bill could not be read."} Try a clearer photo and scan again.
              </p>
            </div>
            <Button size="sm" variant="outline" render={<Link href="/bills/scan" prefetch={false} />}>
              Scan again
            </Button>
          </CardContent>
        </Card>
      ) : bill.status === "processing" ? (
        <Card className="border-border bg-muted/40">
          <CardContent className="flex items-center gap-3 p-5">
            <Loader2 className="size-5 shrink-0 animate-spin text-primary" aria-hidden="true" />
            <p className="flex-1 text-sm">
              This scan is still processing. Give it a few seconds, then{" "}
              <button
                type="button"
                className="text-primary underline-offset-4 hover:underline"
                onClick={() => router.refresh()}
              >
                reload
              </button>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bill photo</CardTitle>
                <CardDescription>Keep an eye out for anything the AI missed.</CardDescription>
              </CardHeader>
              <CardContent>
                {signedUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signedUrl}
                    alt="Scanned bill"
                    className="max-h-96 w-full rounded-lg bg-muted/40 object-contain"
                  />
                ) : (
                  <div className="grid aspect-[4/3] w-full place-items-center rounded-lg bg-muted/40 text-muted-foreground">
                    <ReceiptText className="size-8" aria-hidden="true" />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">Needs review</Badge>
                  {bill.confidence ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {Math.round(bill.confidence.score * 100)}% confident
                    </Badge>
                  ) : null}
                  {bill.provider ?? bill.model ? (
                    <span>
                      Read by {bill.provider ?? "AI"}
                      {bill.model ? ` · ${bill.model}` : ""}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>What the AI read</CardTitle>
                  <CardDescription>
                    {extraction?.isABill === false
                      ? "This doesn’t look like a bill — review carefully or discard it."
                      : "The total and merchant below are pre-filled — change anything that’s off."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {(bill.sanityFlags ?? []).length > 0 ? (
                    <ul className="grid gap-2">
                      {(bill.sanityFlags ?? []).map((flag) => (
                        <li
                          key={flag.code}
                          className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm"
                        >
                          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                          <span>{flag.message}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Looking good — the numbers add up and nothing obvious is missing.
                    </p>
                  )}

                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Merchant</dt>
                      <dd className="truncate font-medium">{extraction?.merchant || "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Bill date</dt>
                      <dd className="font-medium">{extraction?.date ?? "—"}</dd>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Detected total</dt>
                      <dd className="font-medium tabular-nums">
                        {extraction && extraction.total > 0 ? (
                          <Money paise={Math.round(extraction.total * 100)} />
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-muted/40 px-3 py-2">
                      <dt className="text-xs text-muted-foreground">Line items</dt>
                      <dd className="font-medium">{lineItems.length}</dd>
                    </div>
                  </dl>

                  {lineItems.length > 0 ? (
                    <div>
                      <p className="mb-2 text-xs text-muted-foreground">Line items on the bill</p>
                      <ul className="grid divide-y divide-border rounded-lg ring-1 ring-foreground/10">
                        {lineItems.map((item, index) => {
                          const amountPaise = lineItemAmountPaise(item);
                          return (
                            <li key={index} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <span className="min-w-0 flex-1 truncate">{item.description ?? "Item"}</span>
                              {amountPaise !== null ? (
                                <Money paise={amountPaise} className="shrink-0 text-muted-foreground" />
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Line items are stored with the expense for reference — the entry itself is a single amount.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Confirm as expense</CardTitle>
              <CardDescription>
                This creates one expense and updates your wallet. Edit anything below first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormAlert error={serverError} />
              <form onSubmit={form.handleSubmit(submit)} className="grid gap-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount (₹)" htmlFor="review-amount" error={formErrors.amount?.message}>
                    <Input
                      id="review-amount"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="250.00"
                      aria-invalid={Boolean(formErrors.amount)}
                      {...form.register("amount")}
                    />
                  </Field>
                  <Field label="When" htmlFor="review-when" error={formErrors.occurredAt?.message}>
                    <Input
                      id="review-when"
                      type="datetime-local"
                      aria-invalid={Boolean(formErrors.occurredAt)}
                      {...form.register("occurredAt")}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Controller
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <SelectField
                        label="Category"
                        id="review-category"
                        error={formErrors.categoryId?.message}
                        value={field.value ?? NONE}
                        onValueChange={field.onChange}
                        options={categoryOptions}
                        placeholder="Pick a category"
                      />
                    )}
                  />
                  <Controller
                    control={form.control}
                    name="paymentMethodId"
                    render={({ field }) => (
                      <SelectField
                        label="Paid through"
                        id="review-payment"
                        value={field.value ?? NONE}
                        onValueChange={field.onChange}
                        options={paymentOptions}
                        placeholder="None"
                      />
                    )}
                  />
                </div>

                <Field label="Merchant" htmlFor="review-merchant" error={formErrors.merchant?.message} hint="Optional">
                  <Input
                    id="review-merchant"
                    autoComplete="off"
                    placeholder={extraction?.merchant ?? "Zomato, D-Mart, Metro card…"}
                    {...form.register("merchant")}
                  />
                </Field>

                <Field label="Note" htmlFor="review-note" error={formErrors.note?.message} hint="Optional">
                  <Textarea id="review-note" placeholder="Anything to remember about this bill." {...form.register("note")} />
                </Field>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDiscardOpen(true)} disabled={busy}>
                    <Trash2 className="size-4" aria-hidden="true" />
                    Discard
                  </Button>
                  <SubmitButton pending={busy}>Confirm expense</SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </>
      )}

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard this scan?</AlertDialogTitle>
            <AlertDialogDescription>
              The bill stays in your history but won’t become an expense. You can’t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={discard}>
              Discard bill
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}