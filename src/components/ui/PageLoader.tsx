import { useLocation } from "react-router-dom";
import { ProductSkeleton, StoreSkeleton, CheckoutSkeleton, CartSkeleton } from "@/components/ui/skeleton";

export const PageLoader = () => {
  const location = useLocation();

  if (location.pathname.includes("/loja") && !location.pathname.includes("/loja/")) return <StoreSkeleton />;
  if (location.pathname.includes("/loja/")) return <ProductSkeleton />;
  if (location.pathname.includes("/checkout")) return <CheckoutSkeleton />;
  if (location.pathname.includes("/carrinho")) return <CartSkeleton />;

  return (
    <div className="min-h-screen bg-background">
      <div className="h-16 bg-muted/30 animate-pulse" />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
};
