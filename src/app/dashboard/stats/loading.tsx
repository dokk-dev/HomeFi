import { Skeleton } from "@/components/ui/Skeleton";

export default function StatsLoading() {
  return (
    <div className="p-4 md:p-10 flex-1 space-y-12 max-w-5xl w-full">
      <div className="space-y-2">
        <Skeleton className="h-2.5 w-24 rounded" />
        <Skeleton className="h-9 w-64 rounded" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-32 rounded" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}
