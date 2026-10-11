import Link from "next/link";
import { PiggyBank, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GoalLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/goals?new=goal" prefetch={false} />}
      >
        <Plus className="size-4" aria-hidden="true" />
        New goal
      </Button>
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/goals?new=contribution" prefetch={false} />}
      >
        <PiggyBank className="size-4" aria-hidden="true" />
        Add money
      </Button>
    </div>
  );
}