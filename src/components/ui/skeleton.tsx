import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}

export function ProductSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Imagem */}
        <div className="space-y-4">
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6">
          <Skeleton className="h-8 w-3/4 rounded-lg" />
          <Skeleton className="h-6 w-1/4 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-5/6 rounded" />
            <Skeleton className="h-4 w-4/6 rounded" />
          </div>
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function StoreSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-6 rounded-lg" />
      <div className="flex gap-4 mb-6">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-2xl" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-64 mb-8 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-8 w-48 mb-8 rounded-lg" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div>
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export { Skeleton };
