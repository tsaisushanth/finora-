import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function WalletLoading() {
  return (
    <>
      <PageHeader title="Wallet" />
      <div className="grid gap-6" role="status" aria-label="Loading wallet">
        <div className="grid gap-3 rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-9 w-56" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <div>
          <Skeleton className="mb-4 h-6 w-24" />
          <div className="divide-y divide-border rounded-xl bg-card ring-1 ring-foreground/10">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="size-10 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-52 max-w-full" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}