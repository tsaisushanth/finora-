"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Download, MoreVertical, Pencil, ReceiptText, Trash2, TrendingUp } from "lucide-react";
import { formatDateTimeInTimeZone, toDatetimeLocal } from "@/lib/dates";
import { numericToPaise, paiseToNumeric } from "@/lib/money";
import {
  createExpenseAction,
  createIncomeAction,
  deleteExpenseAction,
  deleteIncomeAction,
  exportTransactionsCsvAction,
} from "@/lib/transactions/actions";
import { AddExpenseIncomeLinks } from "@/components/transactions/new-transaction-links";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Money } from "@/components/shared/money";
import { TransactionFilters, type TransactionsFilterState } from "@/components/transactions/transaction-filters";
import { TransactionFormDialog } from "@/components/transactions/transaction-form-dialog";
import type { TransactionFeedItem, TransactionOption } from "@/components/transactions/types";

export type TransactionFeedFilters = {
  search?: string;
  categoryId?: string;
  paymentMethodId?: string;
  from?: string;
  to?: string;
  page: number;
};

export function TransactionsView({
  items,
  total,
  page,
  pageCount,
  filter,
  categories,
  paymentMethods,
  timezone,
}: {
  items: TransactionFeedItem[];
  total: number;
  page: number;
  pageCount: number;
  filter: TransactionFeedFilters;
  categories: TransactionOption[];
  paymentMethods: TransactionOption[];
  timezone: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [removing, setRemoving] = useState<ReadonlySet<string>>(new Set());
  const [form, setForm] = useState<{
    kind: "expense" | "income";
    editing?: TransactionFeedItem | null;
  } | null>(null);
  const [prevUrl, setPrevUrl] = useState<string | null>(null);
  const [prevItemsKey, setPrevItemsKey] = useState<string | null>(null);

  const url = `${pathname}?${searchParams?.toString() ?? ""}`;
  const itemsKey = items.map((item) => item.id).join(",");

  // Adjust state during render (React-sanctioned pattern) when the URL or the
  // refreshed item list changes, instead of calling setState in effects.
  if (url !== prevUrl) {
    setPrevUrl(url);
    const kindParam = searchParams?.get("new");
    if (kindParam === "expense" || kindParam === "income") {
      setForm({ kind: kindParam, editing: null });
    }
  }
  if (prevItemsKey !== null && itemsKey !== prevItemsKey) {
    setPrevItemsKey(itemsKey);
    setRemoving(new Set());
  }

  const categoryNames = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories],
  );
  const categoryColors = useMemo(
    () => new Map(categories.map((c) => [c.id, c.color ?? undefined] as const)),
    [categories],
  );
  const paymentNames = useMemo(
    () => new Map(paymentMethods.map((p) => [p.id, p.name])),
    [paymentMethods],
  );

  const filterState: TransactionsFilterState = {
    search: filter.search ?? "",
    categoryId: filter.categoryId ?? "",
    paymentMethodId: filter.paymentMethodId ?? "",
    from: filter.from ?? "",
    to: filter.to ?? "",
  };

  function filterQuery(next: TransactionsFilterState, targetPage = 1): URLSearchParams {
    const params = new URLSearchParams();
    if (next.search) params.set("search", next.search);
    if (next.categoryId) params.set("categoryId", next.categoryId);
    if (next.paymentMethodId) params.set("paymentMethodId", next.paymentMethodId);
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    params.set("page", String(targetPage));
    return params;
  }

  function navigate(params: URLSearchParams) {
    router.replace(`${pathname}?${params.toString()}`);
  }

  function applyFilters(next: TransactionsFilterState) {
    navigate(filterQuery(next, 1));
  }

  function pageUrl(targetPage: number): string {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("page", String(targetPage));
    return `${pathname}?${params.toString()}`;
  }

  async function handleDelete(item: TransactionFeedItem) {
    const formData = new FormData();
    formData.set("id", item.id);
    setRemoving((prev) => new Set(prev).add(item.id));
    const action = item.kind === "expense" ? deleteExpenseAction : deleteIncomeAction;
    const result = await action(formData);
    if (result?.error) {
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      toast.error(result.error);
      return;
    }
    router.refresh();
    toast.success(item.kind === "expense" ? "Expense deleted" : "Income deleted", {
      action: { label: "Undo", onClick: () => undoDelete(item) },
    });
  }

  async function undoDelete(item: TransactionFeedItem) {
    const formData = new FormData();
    formData.set("amount", paiseToNumeric(numericToPaise(item.amount)));
    formData.set("categoryId", item.categoryId ?? "");
    formData.set("note", item.note ?? "");
    formData.set("occurredAt", toDatetimeLocal(item.occurredAt, timezone));
    if (item.kind === "expense") {
      formData.set("paymentMethodId", item.paymentMethodId ?? "");
      formData.set("merchant", item.title ?? "");
      await createExpenseAction(formData);
    } else {
      formData.set("source", item.title ?? "");
      await createIncomeAction(formData);
    }
    router.refresh();
  }

  async function handleExport() {
    const formData = new FormData();
    formData.set("search", filter.search ?? "");
    formData.set("categoryId", filter.categoryId ?? "");
    formData.set("paymentMethodId", filter.paymentMethodId ?? "");
    formData.set("from", filter.from ?? "");
    formData.set("to", filter.to ?? "");
    const result = await exportTransactionsCsvAction(formData);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (!result.csv) return;
    const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = result.filename ?? "transactions.csv";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const visibleRows = items.filter((item) => !removing.has(item.id));
  const hasFilters = Boolean(
    filter.search || filter.categoryId || filter.paymentMethodId || filter.from || filter.to,
  );

  return (
    <div className="grid gap-5">
      <TransactionFilters
        key={`${filter.search}|${filter.categoryId}|${filter.paymentMethodId}|${filter.from}|${filter.to}`}
        state={filterState}
        categories={categories}
        paymentMethods={paymentMethods}
        onApply={applyFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? hasFilters
              ? "No transactions match these filters."
              : "No transactions yet."
            : `${total} transaction${total === 1 ? "" : "s"} found`}
        </p>
        <Button type="button" variant="outline" size="sm" disabled={total === 0} onClick={handleExport}>
          <Download className="size-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {visibleRows.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={hasFilters ? "Nothing matches" : "No transactions yet"}
          description={
            hasFilters
              ? "Try widening your search or clearing a filter."
              : "Log your first expense or add income — it shows up here and updates your wallet automatically."
          }
          action={<AddExpenseIncomeLinks />}
        />
      ) : (
        <ul className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {visibleRows.map((item) => {
            const isExpense = item.kind === "expense";
            const title =
              item.title || (isExpense ? "Expense" : "Income");
            const categoryName = item.categoryId ? categoryNames.get(item.categoryId) ?? null : null;
            const categoryColor = item.categoryId ? categoryColors.get(item.categoryId) : undefined;
            const meta = [
              categoryName,
              isExpense && item.paymentMethodId ? paymentNames.get(item.paymentMethodId) ?? null : null,
            ]
              .filter(Boolean)
              .join(" · ");
            const amountPaise = isExpense ? -numericToPaise(item.amount) : numericToPaise(item.amount);
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${
                    isExpense ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {isExpense ? (
                    <ReceiptText className="size-5" aria-hidden="true" />
                  ) : (
                    <TrendingUp className="size-5" aria-hidden="true" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    {categoryColor ? (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: categoryColor }}
                        aria-hidden="true"
                      />
                    ) : null}
                    <span className="truncate">{title}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDateTimeInTimeZone(item.occurredAt, timezone)}
                    {meta ? ` · ${meta}` : ""}
                  </p>
                  {item.note ? (
                    <p className="truncate text-xs text-muted-foreground/80">{item.note}</p>
                  ) : null}
                </div>

                <Money paise={amountPaise} tone={isExpense ? "negative" : "positive"} className="text-sm" />

                <RowMenu
                  item={item}
                  onEdit={() => setForm({ kind: "expense", editing: item })}
                  onDelete={() => handleDelete(item)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {pageCount > 1 ? (
        <Pagination>
          <PaginationContent>
            {page > 1 ? (
              <PaginationItem>
                <PaginationPrevious href={pageUrl(page - 1)} />
              </PaginationItem>
            ) : null}
            <PaginationItem>
              <span className="px-3 text-sm text-muted-foreground">
                Page {page} of {pageCount}
              </span>
            </PaginationItem>
            {page < pageCount ? (
              <PaginationItem>
                <PaginationNext href={pageUrl(page + 1)} />
              </PaginationItem>
            ) : null}
          </PaginationContent>
        </Pagination>
      ) : null}

      <Separator className="my-1" />

      <TransactionFormDialog
        key={form ? `${form.kind}-${form.editing?.id ?? "new"}` : "closed"}
        kind={form?.kind ?? "expense"}
        open={form !== null}
        onOpenChange={(open) => {
          if (!open) setForm(null);
        }}
        categories={categories}
        paymentMethods={paymentMethods}
        timezone={timezone}
        editing={form?.editing ?? null}
        onSaved={() => {
          setForm(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function RowMenu({
  item,
  onEdit,
  onDelete,
}: {
  item: TransactionFeedItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${item.title ?? item.kind}`} />}
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {item.kind === "expense" ? (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this {item.kind}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the entry and adjusts your wallet balance. You can undo it right afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmOpen(false);
                onDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}