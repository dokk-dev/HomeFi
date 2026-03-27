import { Skeleton } from "@/components/ui/Skeleton";

export default function PillarLoading() {
  return (
    <div className="flex-1 p-6 max-w-3xl w-full mx-auto space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-1.5 w-full mt-2" />
        </div>
      </div>

      {/* Task form skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <Skeleton className="h-9 w-full" />
      </div>

      {/* Task list skeleton */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800">
          <Skeleton className="h-3 w-24" />
        </div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/50">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-4 flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
