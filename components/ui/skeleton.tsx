import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

// Feature card skeleton for hub/gate pages
function FeatureCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  )
}

// Photo grid skeleton for mural/gallery
function PhotoGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  )
}

// Stats card skeleton
function StatsCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("bg-card border border-border rounded-lg p-6", className)}>
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-16" />
        </div>
      </div>
    </div>
  )
}

// Page loader skeleton (logo animation)
function PageLoaderSkeleton() {
  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center">
      <div className="animate-pulse">
        <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
          <span className="text-white font-bold text-xl">K</span>
        </div>
      </div>
    </div>
  )
}

// Hub page skeleton
function HubPageSkeleton() {
  return (
    <div className="dark min-h-screen bg-background pb-24">
      {/* Header skeleton */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="container mx-auto px-4 py-6">
        {/* Welcome section */}
        <div className="mb-8 space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>

        {/* Feature cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <FeatureCardSkeleton key={i} />
          ))}
        </div>

        {/* CTA skeleton */}
        <div className="bg-gradient-to-br from-keepit-brand/10 to-keepit-brand/10 border border-keepit-brand/20 rounded-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <Skeleton className="h-14 w-14 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-10 w-40 mt-3" />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export {
  Skeleton,
  FeatureCardSkeleton,
  PhotoGridSkeleton,
  StatsCardSkeleton,
  PageLoaderSkeleton,
  HubPageSkeleton
}
