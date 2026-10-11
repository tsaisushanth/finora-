import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoansLoading() {
  return (
    <>
      <PageHeader title="Loans" />
      <div className="grid gap-6" role="status" aria-label="Loading loans">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="mb-3 size-9 rounded-lg" />
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
        <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}