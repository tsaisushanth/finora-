import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fromZonedTime } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { numericToPaise } from "@/lib/money";
import type { TransactionFilters } from "@/lib/validations/transactions";

export const TRANSACTIONS_PAGE_SIZE = 25;
export const WALLET_PAGE_SIZE = 25;

export type CategoryOption = {
  id: string;
  name: string;
  color: string;
  kind: string;
};

export type PaymentMethodOption = {
  id: string;
  name: string;
  type: string;
};

export type TransactionItem = {
  kind: "expense" | "income";
  id: string;
  amount: number;
  categoryId: string | null;
  paymentMethodId: string | null;
  title: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

export type WalletEntry = {
  id: string;
  type: string;
  amount: number;
  occurredAt: string;
  note: string | null;
  refType: string | null;
  refId: string | null;
};

export type WalletStats = {
  addedPaise: number;
  movedOutPaise: number;
  inGoalsPaise: number;
  lentOutstandingPaise: number;
  borrowedOutstandingPaise: number;
};

/** Escape LIKE wildcards so free-text search matches literally. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

function dateBounds(
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { fromIso: string | null; toIso: string | null } {
  return {
    fromIso: from
      ? fromZonedTime(new Date(`${from}T00:00:00`), timeZone).toISOString()
      : null,
    toIso: to
      ? fromZonedTime(new Date(`${to}T23:59:59.999`), timeZone).toISOString()
      : null,
  };
}

/**
 * The combined expense + income feed, newest first. Both tables are small in a
 * personal finance app, so the union happens in TypeScript after filtered reads.
 */
async function listTransactionFeed(
  userId: string,
  filters: TransactionFilters,
  timeZone: string,
): Promise<TransactionItem[]> {
  const supabase = await createClient();
  const { search, categoryId, paymentMethodId } = filters;
  const { fromIso, toIso } = dateBounds(filters.from, filters.to, timeZone);

  let expenseQuery = supabase
    .from("expenses")
    .select("id, amount, category_id, payment_method_id, merchant, note, occurred_at, created_at")
    .eq("user_id", userId);
  if (categoryId) expenseQuery = expenseQuery.eq("category_id", categoryId);
  if (paymentMethodId) {
    expenseQuery = expenseQuery.eq("payment_method_id", paymentMethodId);
  }
  if (search) {
    const term = `%${escapeLike(search)}%`;
    expenseQuery = expenseQuery.or(`merchant.ilike.${term},note.ilike.${term}`);
  }
  if (fromIso) expenseQuery = expenseQuery.gte("occurred_at", fromIso);
  if (toIso) expenseQuery = expenseQuery.lte("occurred_at", toIso);

  let incomeQuery = supabase
    .from("income_entries")
    .select("id, amount, category_id, source, note, occurred_at, created_at")
    .eq("user_id", userId);
  if (categoryId) incomeQuery = incomeQuery.eq("category_id", categoryId);
  if (search) {
    const term = `%${escapeLike(search)}%`;
    incomeQuery = incomeQuery.or(`source.ilike.${term},note.ilike.${term}`);
  }
  if (fromIso) incomeQuery = incomeQuery.gte("occurred_at", fromIso);
  if (toIso) incomeQuery = incomeQuery.lte("occurred_at", toIso);

  // Fire both table reads in parallel — the two feeds are independent.
  const [expenseResult, incomeResult] = await Promise.all([
    expenseQuery.order("occurred_at", { ascending: false }),
    incomeQuery.order("occurred_at", { ascending: false }),
  ]);
  const { data: expenses, error: expenseError } = expenseResult;
  const { data: incomes, error: incomeError } = incomeResult;
  if (expenseError) throw new Error(expenseError.message);
  if (incomeError) throw new Error(incomeError.message);

  const items: TransactionItem[] = [
    ...(expenses ?? []).map((row) => ({
      kind: "expense" as const,
      id: row.id,
      amount: row.amount,
      categoryId: row.category_id,
      paymentMethodId: row.payment_method_id,
      title: row.merchant,
      note: row.note,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    })),
    ...(incomes ?? []).map((row) => ({
      kind: "income" as const,
      id: row.id,
      amount: row.amount,
      categoryId: row.category_id,
      paymentMethodId: null,
      title: row.source,
      note: row.note,
      occurredAt: row.occurred_at,
      createdAt: row.created_at,
    })),
  ];
  items.sort((a, b) => {
    const byTime = b.occurredAt.localeCompare(a.occurredAt);
    return byTime !== 0 ? byTime : b.createdAt.localeCompare(a.createdAt);
  });
  return items;
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const all = await listTransactionFeed(userId, filters, timeZone);
  const total = all.length;
  const pageCount = Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE));
  const page = Math.min(filters.page ?? 1, pageCount);
  const start = (page - 1) * TRANSACTIONS_PAGE_SIZE;
  return {
    items: all.slice(start, start + TRANSACTIONS_PAGE_SIZE),
    total,
    page,
    pageCount,
  };
}

/** Every matching row, ignoring pagination — used for CSV export. */
export async function listAllTransactions(
  userId: string,
  filters: TransactionFilters,
  timeZone: string = DEFAULT_TIMEZONE,
): Promise<TransactionItem[]> {
  return listTransactionFeed(userId, filters, timeZone);
}

export async function getTransactionOptions(userId: string): Promise<{
  categories: CategoryOption[];
  paymentMethods: PaymentMethodOption[];
}> {
  const supabase = await createClient();
  const [categoryResult, methodResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, color, kind")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("payment_methods")
      .select("id, name, type")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("name", { ascending: true }),
  ]);
  if (categoryResult.error) throw new Error(categoryResult.error.message);
  if (methodResult.error) throw new Error(methodResult.error.message);
  return {
    categories: categoryResult.data ?? [],
    paymentMethods: methodResult.data ?? [],
  };
}

export const WALLET_TYPE_LABELS: Record<string, string> = {
  opening_balance: "Opening balance",
  income: "Money added",
  expense: "Expense",
  loan_given: "Loan given",
  loan_repayment_received: "Repayment received",
  loan_taken: "Loan taken",
  loan_repayment_made: "Repayment made",
  goal_contribution: "Goal contribution",
  goal_withdrawal: "Money back from goals",
  adjustment: "Adjustment",
};

export async function getWalletFeed(userId: string, page: number) {
  const supabase = await createClient();
  const maxPage = Math.max(1, page);
  const start = (maxPage - 1) * WALLET_PAGE_SIZE;

  // Balance, ledger page and the stats scan are independent — read them in parallel.
  const [balanceResult, entriesResult, allEntriesResult] = await Promise.all([
    supabase.rpc("wallet_balance"),
    supabase
      .from("wallet_entries")
      .select("id, type, amount, occurred_at, note, ref_type, ref_id", {
        count: "exact",
      })
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .range(start, start + WALLET_PAGE_SIZE - 1),
    supabase
      .from("wallet_entries")
      .select("type, amount")
      .eq("user_id", userId),
  ]);
  const { data: balanceValue, error: balanceError } = balanceResult;
  const {
    data: entriesData,
    count: total,
    error: entriesError,
  } = entriesResult;
  const { data: allEntries, error: allEntriesError } = allEntriesResult;
  if (balanceError) throw new Error(balanceError.message);
  if (entriesError) throw new Error(entriesError.message);
  if (allEntriesError) throw new Error(allEntriesError.message);
  if (!Array.isArray(allEntries)) throw new Error("Could not read wallet ledger");

  const stats: WalletStats = {
    addedPaise: 0,
    movedOutPaise: 0,
    inGoalsPaise: 0,
    lentOutstandingPaise: 0,
    borrowedOutstandingPaise: 0,
  };
  for (const entry of allEntries) {
    const amountPaise = numericToPaise(entry.amount);
    if (amountPaise > 0) stats.addedPaise += amountPaise;
    else stats.movedOutPaise += -amountPaise;

    if (entry.type === "goal_contribution") {
      stats.inGoalsPaise += -amountPaise;
    } else if (entry.type === "goal_withdrawal") {
      stats.inGoalsPaise -= amountPaise;
    } else if (entry.type === "loan_given") {
      stats.lentOutstandingPaise += -amountPaise;
    } else if (entry.type === "loan_repayment_received") {
      stats.lentOutstandingPaise -= amountPaise;
    } else if (entry.type === "loan_taken") {
      stats.borrowedOutstandingPaise += amountPaise;
    } else if (entry.type === "loan_repayment_made") {
      stats.borrowedOutstandingPaise += amountPaise;
    }
  }

  const entries: WalletEntry[] = (entriesData ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    amount: row.amount,
    occurredAt: row.occurred_at,
    note: row.note,
    refType: row.ref_type,
    refId: row.ref_id,
  }));

  const totalCount = total ?? entries.length;
  return {
    balancePaise: numericToPaise(balanceValue),
    stats,
    entries,
    total: totalCount,
    page: maxPage,
    pageCount: Math.max(1, Math.ceil(totalCount / WALLET_PAGE_SIZE)),
  };
}