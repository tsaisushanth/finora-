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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function dateBounds(
  from: string | undefined,
  to: string | undefined,
  timeZone: string,
): { fromIso: string | null; toIso: string | null } {
  return {
    // Ignore anything that isn't a yyyy-MM-dd date instead of crashing the page.
    fromIso: from && DATE_RE.test(from)
      ? fromZonedTime(new Date(`${from}T00:00:00`), timeZone).toISOString()
      : null,
    toIso: to && DATE_RE.test(to)
      ? fromZonedTime(new Date(`${to}T23:59:59.999`), timeZone).toISOString()
      : null,
  };
}

/** Row shape of the `transactions_feed` view (expenses + income_entries). */
export type FeedRow = {
  kind: "expense" | "income";
  id: string;
  amount: number;
  category_id: string | null;
  payment_method_id: string | null;
  title: string | null;
  note: string | null;
  occurred_at: string;
  created_at: string;
};

const FEED_COLUMNS =
  "id, kind, amount, category_id, payment_method_id, title, note, occurred_at, created_at";

/**
 * The combined expense + income feed, newest first. Slicing and counting happen
 * in Postgres through the `transactions_feed` view, so a page of 25 rows never
 * downloads the whole history (the old union-in-TypeScript approach got slow
 * and hit PostgREST's 1000-row cap, silently breaking totals).
 */
async function listTransactionFeed(
  userId: string,
  filters: TransactionFilters,
  timeZone: string,
  range?: { start: number; end: number },
): Promise<{ items: TransactionItem[]; total: number }> {
  const supabase = await createClient();
  const { search, categoryId, paymentMethodId } = filters;
  const { fromIso, toIso } = dateBounds(filters.from, filters.to, timeZone);

  // The view isn't in the generated types yet; the cast only loosens the
  // compile-time relation name, the runtime string is the real feed view.
  const feed = supabase.from("transactions_feed" as unknown as "expenses");
  let countBuilder = feed
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  let dataBuilder = feed.select(FEED_COLUMNS).eq("user_id", userId);

  if (categoryId) {
    countBuilder = countBuilder.eq("category_id", categoryId);
    dataBuilder = dataBuilder.eq("category_id", categoryId);
  }
  if (paymentMethodId) {
    countBuilder = countBuilder.eq("payment_method_id", paymentMethodId);
    dataBuilder = dataBuilder.eq("payment_method_id", paymentMethodId);
  }
  if (search) {
    const term = `%${escapeLike(search)}%`;
    countBuilder = countBuilder.or(`title.ilike.${term},note.ilike.${term}`);
    dataBuilder = dataBuilder.or(`title.ilike.${term},note.ilike.${term}`);
  }
  if (fromIso) {
    countBuilder = countBuilder.gte("occurred_at", fromIso);
    dataBuilder = dataBuilder.gte("occurred_at", fromIso);
  }
  if (toIso) {
    countBuilder = countBuilder.lte("occurred_at", toIso);
    dataBuilder = dataBuilder.lte("occurred_at", toIso);
  }

  let dataQuery = dataBuilder
    .order("occurred_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (range) dataQuery = dataQuery.range(range.start, range.end);

  // Fire the count and the page slice in parallel.
  const [countResult, dataResult] = await Promise.all([countBuilder, dataQuery]);
  const { count, error: countError } = countResult;
  const { data, error: dataError } = dataResult;
  if (countError) throw new Error(countError.message);
  if (dataError) throw new Error(dataError.message);

  const items: TransactionItem[] = (data ?? []).map((row) => {
    const feedRow = row as unknown as FeedRow;
    return {
      kind: feedRow.kind === "income" ? "income" : "expense",
      id: feedRow.id,
      amount: feedRow.amount,
      categoryId: feedRow.category_id,
      paymentMethodId: feedRow.payment_method_id,
      title: feedRow.title,
      note: feedRow.note,
      occurredAt: feedRow.occurred_at,
      createdAt: feedRow.created_at,
    };
  });
  return { items, total: count ?? items.length };
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
  timeZone: string = DEFAULT_TIMEZONE,
) {
  const requestedPage = Math.max(1, filters.page ?? 1);
  const start = (requestedPage - 1) * TRANSACTIONS_PAGE_SIZE;
  const { items, total } = await listTransactionFeed(userId, filters, timeZone, {
    start,
    end: start + TRANSACTIONS_PAGE_SIZE - 1,
  });
  const pageCount = Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  return { items, total, page, pageCount };
}

/** Every matching row, ignoring pagination — used for CSV export. */
export async function listAllTransactions(
  userId: string,
  filters: TransactionFilters,
  timeZone: string = DEFAULT_TIMEZONE,
): Promise<TransactionItem[]> {
  const { items } = await listTransactionFeed(userId, filters, timeZone);
  return items;
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

/** Row shape of the `wallet_stats` aggregate view. */
export type WalletStatsRow = {
  user_id: string;
  added: number;
  moved_out: number;
  in_goals: number;
  lent_outstanding: number;
  borrowed_outstanding: number;
};

function emptyStats(): WalletStats {
  return {
    addedPaise: 0,
    movedOutPaise: 0,
    inGoalsPaise: 0,
    lentOutstandingPaise: 0,
    borrowedOutstandingPaise: 0,
  };
}

/**
 * Summary stats straight from the `wallet_stats` view. Previously every caller
 * pulled the whole ledger with `select("type, amount")`, which got slow and was
 * silently truncated at PostgREST's 1000-row cap.
 */
async function fetchWalletStats(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<WalletStats> {
  const view = supabase.from("wallet_stats" as unknown as "wallet_balances");
  const { data, error } = await view
    .select(
      "user_id, added, moved_out, in_goals, lent_outstanding, borrowed_outstanding",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as WalletStatsRow | null;
  if (!row) return emptyStats();
  return {
    addedPaise: numericToPaise(row.added),
    movedOutPaise: numericToPaise(row.moved_out),
    inGoalsPaise: numericToPaise(row.in_goals),
    lentOutstandingPaise: numericToPaise(row.lent_outstanding),
    borrowedOutstandingPaise: numericToPaise(row.borrowed_outstanding),
  };
}

/** Lightweight balance + summary stats for the dashboard (no ledger page). */
export async function getWalletSummary(userId: string) {
  const supabase = await createClient();
  const [balanceResult, stats] = await Promise.all([
    supabase.rpc("wallet_balance"),
    fetchWalletStats(supabase, userId),
  ]);
  const { data: balanceValue, error: balanceError } = balanceResult;
  if (balanceError) throw new Error(balanceError.message);
  return { balancePaise: numericToPaise(balanceValue), stats };
}

export async function getWalletFeed(userId: string, page: number) {
  const supabase = await createClient();
  const maxPage = Math.max(1, page);
  const start = (maxPage - 1) * WALLET_PAGE_SIZE;

  // Balance, ledger page and the aggregate stats are independent — read in parallel.
  const [balanceResult, entriesResult, stats] = await Promise.all([
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
    fetchWalletStats(supabase, userId),
  ]);
  const { data: balanceValue, error: balanceError } = balanceResult;
  const {
    data: entriesData,
    count: total,
    error: entriesError,
  } = entriesResult;
  if (balanceError) throw new Error(balanceError.message);
  if (entriesError) throw new Error(entriesError.message);

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