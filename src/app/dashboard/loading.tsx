import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="p-4 md:p-10 flex-1 space-y-12 max-w-6xl w-full">
      {/* Focus section */}
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-28 rounded" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>

      {/* Pillars */}
      <div className="space-y-4">
        <Skeleton className="h-2.5 w-24 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Queue + momentum */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <Skeleton className="h-2.5 w-14 rounded" />
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-2.5 w-32 rounded" />
          <Skeleton className="h-52 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
