import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen w-full">
      <div className="hidden h-screen w-60 shrink-0 border-r border-border bg-sidebar md:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-16 items-center justify-between border-b border-border px-4 sm:px-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-28" />
        </div>
        <div className="flex-1 px-4 py-8 sm:px-6">
          <div className="mx-auto w-full max-w-5xl">
            <Skeleton className="h-7 w-44" />
            <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-2xl border border-border bg-card"
                >
                  <Skeleton className="aspect-video rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
