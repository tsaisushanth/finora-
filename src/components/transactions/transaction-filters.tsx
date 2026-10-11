"use client";

import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { SelectField } from "@/components/forms/select-field";
import type { TransactionOption } from "@/components/transactions/types";

export type TransactionsFilterState = {
  search: string;
  categoryId: string;
  paymentMethodId: string;
  from: string;
  to: string;
};

export function TransactionFilters({
  state,
  categories,
  paymentMethods,
  onApply,
}: {
  state: TransactionsFilterState;
  categories: TransactionOption[];
  paymentMethods: TransactionOption[];
  onApply: (next: TransactionsFilterState) => void;
}) {
  const [search, setSearch] = useState(state.search);
  const [categoryId, setCategoryId] = useState(state.categoryId);
  const [paymentMethodId, setPaymentMethodId] = useState(state.paymentMethodId);
  const [from, setFrom] = useState(state.from);
  const [to, setTo] = useState(state.to);

  function apply() {
    onApply({ search, categoryId, paymentMethodId, from, to });
  }

  return (
    <form
      className="grid gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        apply();
      }}
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
        <Field label="Search" htmlFor="transaction-search" hint="">
          <Input
            id="transaction-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Merchant, source or note…"
            className="md:min-w-56"
          />
        </Field>
        <Field label="From">
          <Input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            aria-label="From date"
          />
        </Field>
        <Field label="To">
          <Input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            aria-label="To date"
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Category"
          id="filter-category"
          value={categoryId}
          onValueChange={(value) => setCategoryId(value)}
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
        <SelectField
          label="Payment method"
          id="filter-payment"
          value={paymentMethodId}
          onValueChange={(value) => setPaymentMethodId(value)}
          options={[
            { value: "", label: "All payment methods" },
            ...paymentMethods.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm">
          <Search className="size-4" aria-hidden="true" />
          Apply filters
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() =>
            onApply({ search: "", categoryId: "", paymentMethodId: "", from: "", to: "" })
          }
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </form>
  );
}