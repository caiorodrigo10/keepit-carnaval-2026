import { Skeleton } from "@/components/ui/skeleton";
import { Camera } from "lucide-react";

export function MuralSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-keepit-brand/10 border border-keepit-brand/20">
              <Camera className="w-5 h-5 text-keepit-brand" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">Mural de Fotos</h1>
              <p className="text-xs text-muted-foreground">
                Carnaval 2026 - Anhembi
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filter skeleton */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-square rounded-lg"
            />
          ))}
        </div>
      </main>
    </div>
  );
}
