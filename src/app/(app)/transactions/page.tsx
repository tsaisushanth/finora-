import type { Metadata } from "next";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getTransactionOptions, listTransactions } from "@/lib/transactions/queries";
import { transactionsFilterSchema } from "@/lib/validations/transactions";
import { PageHeader } from "@/components/page-header";
import { AddExpenseIncomeLinks } from "@/components/transactions/new-transaction-links";
import { TransactionsView } from "@/components/transactions/transactions-view";

export const metadata: Metadata = { title: "Transactions" };

type SearchParams = Record<string, string | string[] | undefined>;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await requireOnboardedProfile();
  const raw = await searchParams;

  const parsed = transactionsFilterSchema.safeParse({
    search: raw.search,
    categoryId: raw.categoryId,
    paymentMethodId: raw.paymentMethodId,
    from: raw.from,
    to: raw.to,
    page: raw.page,
  });
  const filters = parsed.success ? parsed.data : { page: 1 };

  const [{ items, total, page, pageCount }, { categories, paymentMethods }] =
    await Promise.all([
      listTransactions(profile.id, filters, profile.timezone),
      getTransactionOptions(profile.id),
    ]);

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every expense and income, in one chronological list."
      >
        <AddExpenseIncomeLinks />
      </PageHeader>
      <TransactionsView
        items={items}
        total={total}
        page={page}
        pageCount={pageCount}
        filter={{
          search: typeof raw.search === "string" ? raw.search : undefined,
          categoryId: typeof raw.categoryId === "string" ? raw.categoryId : undefined,
          paymentMethodId: typeof raw.paymentMethodId === "string" ? raw.paymentMethodId : undefined,
          from: typeof raw.from === "string" ? raw.from : undefined,
          to: typeof raw.to === "string" ? raw.to : undefined,
          page,
        }}
        categories={categories.map((category) => ({ id: category.id, name: category.name, color: category.color }))}
        paymentMethods={paymentMethods.map((method) => ({ id: method.id, name: method.name }))}
        timezone={profile.timezone}
      />
    </>
  );
}