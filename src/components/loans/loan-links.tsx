import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoanLinks() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <Button
        variant="outline"
        size="sm"
        render={<Link href="/loans?new=loan" prefetch={false} />}
      >
        <Plus className="size-4" aria-hidden="true" />
        Record loan
      </Button>
    </div>
  );
}