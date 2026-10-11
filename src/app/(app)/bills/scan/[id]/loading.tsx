import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanReviewLoading() {
  return (
    <>
      <PageHeader title="Review scan" />
      <div className="grid gap-6" role="status" aria-label="Loading scan review">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <Skeleton className="mb-1 h-4 w-32" />
            <Skeleton className="mb-4 h-3 w-56" />
            <Skeleton className="aspect-[4/3] w-full rounded-lg" />
          </div>
          <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <Skeleton className="mb-1 h-4 w-36" />
            <Skeleton className="mb-4 h-3 w-64" />
            <Skeleton className="mb-3 h-20 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          </div>
        </div>
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <Skeleton className="mb-1 h-4 w-40" />
          <Skeleton className="mb-5 h-3 w-64" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="mt-4 h-9 w-full" />
          <Skeleton className="mt-4 h-9 w-full" />
        </div>
      </div>
    </>
  );
}