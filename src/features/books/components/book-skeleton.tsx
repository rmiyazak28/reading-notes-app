import { Skeleton } from "@/components/ui/skeleton"

export function BookTableSkeleton() {
  return (
    <div className="glass rounded-lg overflow-hidden">
      <div className="bg-white/5 p-3 border-b border-white/10">
        <div className="grid grid-cols-7 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 bg-white/10" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-white/10">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-3">
            <div className="grid grid-cols-7 gap-4 items-center">
              <Skeleton className="h-4 bg-white/10 col-span-1" />
              <Skeleton className="h-4 bg-white/10 col-span-1" />
              <Skeleton className="h-4 w-16 bg-white/10" />
              <Skeleton className="h-6 w-16 bg-white/10 rounded" />
              <Skeleton className="h-4 w-8 bg-white/10 mx-auto" />
              <Skeleton className="h-4 w-20 bg-white/10" />
              <Skeleton className="h-4 w-24 bg-white/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BookCardSkeleton() {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4 bg-white/10" />
          <Skeleton className="h-4 w-1/2 bg-white/10" />
        </div>
        <Skeleton className="h-6 w-16 bg-white/10 rounded" />
      </div>
      <div className="flex items-center gap-4 mt-3">
        <Skeleton className="h-4 w-12 bg-white/10" />
        <Skeleton className="h-4 w-8 bg-white/10" />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <Skeleton className="h-4 w-20 bg-white/10" />
        <Skeleton className="h-3 w-24 bg-white/10" />
      </div>
    </div>
  )
}

export function BookCardListSkeleton() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  )
}
