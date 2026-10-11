import "server-only";
import { createClient } from "@/lib/supabase/server";
import { numericToPaise } from "@/lib/money";

export type LoanItem = {
  id: string;
  direction: "lent" | "borrowed";
  person: string;
  principalPaise: number;
  repaidPaise: number;
  outstandingPaise: number;
  status: "active" | "partially_repaid" | "settled" | "written_off";
  dueDate: string | null;
  note: string | null;
  occurredAt: string;
};

export type LoanRepayment = {
  id: string;
  loanId: string;
  amount: number;
  occurredAt: string;
  note: string | null;
};

export async function getLoans(userId: string) {
  const supabase = await createClient();
  const [loansResult, repaymentsResult] = await Promise.all([
    supabase
      .from("loans")
      .select("id, direction, person, principal, status, due_date, note, occurred_at, created_at")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
    supabase
      .from("loan_repayments")
      .select("id, loan_id, amount, occurred_at, note")
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false }),
  ]);
  if (loansResult.error) throw new Error(loansResult.error.message);
  if (repaymentsResult.error) throw new Error(repaymentsResult.error.message);

  const repaidByLoan = new Map<string, number>();
  const repayments: LoanRepayment[] = (repaymentsResult.data ?? []).map((row) => {
    repaidByLoan.set(row.loan_id, (repaidByLoan.get(row.loan_id) ?? 0) + numericToPaise(row.amount));
    return {
      id: row.id,
      loanId: row.loan_id,
      amount: row.amount,
      occurredAt: row.occurred_at,
      note: row.note,
    };
  });

  const loans: LoanItem[] = (loansResult.data ?? []).map((loan) => {
    const principalPaise = numericToPaise(loan.principal);
    const repaidPaise = Math.min(principalPaise, repaidByLoan.get(loan.id) ?? 0);
    return {
      id: loan.id,
      direction: loan.direction as LoanItem["direction"],
      person: loan.person,
      principalPaise,
      repaidPaise,
      outstandingPaise: principalPaise - repaidPaise,
      status: loan.status as LoanItem["status"],
      dueDate: loan.due_date,
      note: loan.note,
      occurredAt: loan.occurred_at,
    };
  });

  const open = loans
    .filter((loan) => loan.status !== "settled" && loan.status !== "written_off")
    .sort((a, b) => b.outstandingPaise - a.outstandingPaise);
  const closed = loans.filter(
    (loan) => loan.status === "settled" || loan.status === "written_off",
  );

  return { loans: [...open, ...closed], repayments };
}