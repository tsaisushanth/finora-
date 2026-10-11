import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function InsightsLoading() {
  return (
    <>
      <PageHeader title="Insights" />
      <div className="grid gap-6" role="status" aria-label="Loading insights">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="mb-3 size-9 rounded-lg" />
              <Skeleton className="mb-2 h-3 w-24" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="mb-1 h-4 w-44" />
          <Skeleton className="mb-5 h-3 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <Skeleton className="mb-1 h-4 w-40" />
              <Skeleton className="mb-5 h-3 w-56" />
              <Skeleton className="h-56 w-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}