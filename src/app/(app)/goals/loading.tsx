import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsLoading() {
  return (
    <>
      <PageHeader title="Goals" />
      <div className="grid gap-6" role="status" aria-label="Loading goals">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
              <Skeleton className="mb-3 size-9 rounded-lg" />
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="h-5 w-28" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
              <Skeleton className="mb-2 h-4 w-40 max-w-full" />
              <Skeleton className="mb-4 h-3 w-24" />
              <Skeleton className="mb-2 h-3 w-full" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}