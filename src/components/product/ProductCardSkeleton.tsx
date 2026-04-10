const ProductCardSkeleton = () => (
  <div className="bg-card rounded-xl border border-border overflow-hidden">
    <div className="aspect-[4/3] bg-muted animate-pulse" />
    <div className="p-4 space-y-3">
      <div className="h-3 bg-muted rounded animate-pulse w-2/5" />
      <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
      <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
      <div className="h-6 bg-muted rounded animate-pulse w-1/3 mt-2" />
      <div className="flex gap-2 mt-2">
        <div className="h-9 bg-muted rounded-lg animate-pulse flex-1" />
        <div className="h-9 bg-muted rounded-lg animate-pulse w-20" />
      </div>
    </div>
  </div>
);

export const ProductCardSkeletonGrid = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export default ProductCardSkeleton;
