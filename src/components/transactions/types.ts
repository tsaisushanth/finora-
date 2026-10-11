export type TransactionOption = { id: string; name: string; color?: string };

export type TransactionFeedItem = {
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

export type TransactionFormTarget = {
  id: string;
  amount: number;
  categoryId: string | null;
  paymentMethodId: string | null;
  title: string | null;
  note: string | null;
  occurredAt: string;
};