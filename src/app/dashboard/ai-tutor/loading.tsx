import { Skeleton } from "@/components/ui/Skeleton";

export default function AiTutorLoading() {
  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex gap-2 px-4 md:px-8 pt-4 pb-4 border-b border-outline-variant/10">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="w-20 h-20 rounded-2xl" />
        </div>
      </div>
      <aside className="hidden md:block w-80 border-l border-outline-variant/10 p-5 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </aside>
    </div>
  );
}
