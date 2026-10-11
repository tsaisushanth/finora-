import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AddExpenseIncomeLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={
          <Link href="/transactions?new=expense" prefetch={false} />
        }
      >
        <Plus className="size-4" aria-hidden="true" />
        Add expense
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={
          <Link href="/transactions?new=income" prefetch={false} />
        }
      >
        <TrendingUp className="size-4" aria-hidden="true" />
        Add income
      </Button>
    </div>
  );
}