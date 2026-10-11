import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ScanLoading() {
  return (
    <>
      <PageHeader title="Scan a bill" />
      <div className="grid gap-6" role="status" aria-label="Loading bill scanning">
        <div className="grid place-items-center rounded-xl border border-dashed bg-card px-6 py-16">
          <Skeleton className="mb-4 size-14 rounded-full" />
          <Skeleton className="mb-2 h-4 w-48" />
          <Skeleton className="h-3 w-56" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-4 w-24" />
          <div className="rounded-xl bg-card ring-1 ring-foreground/10">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1">
                  <Skeleton className="mb-2 h-3 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}