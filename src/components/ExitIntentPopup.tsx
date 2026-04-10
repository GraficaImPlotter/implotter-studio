import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

const STORAGE_KEY = "implotter-exit-intent-shown";

const ExitIntentPopup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();

  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    if (open) return;

    // Don’t show during checkout/payment
    if (location.pathname.startsWith("/checkout") || location.pathname.startsWith("/pagamento")) return;

    if (localStorage.getItem(STORAGE_KEY) === "true") return;

    const onMouseLeave = (e: MouseEvent) => {
      // leaving to the top generally indicates tab close / new URL intent
      if ((e as any).clientY <= 0) {
        localStorage.setItem(STORAGE_KEY, "true");
        setOpen(true);
      }
    };

    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [items.length, location.pathname, open]);

  if (items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-muted p-3 rounded-full mb-2 w-fit">
            <ShoppingCart className="w-6 h-6 text-foreground" />
          </div>
          <DialogTitle className="text-center">Você estava finalizando a compra?</DialogTitle>
          <DialogDescription className="text-center">
            Seu carrinho está pronto — finalize agora para não perder tempo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Button
            variant="hero"
            onClick={() => {
              setOpen(false);
              navigate("/checkout");
            }}
          >
            Finalizar agora
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Continuar navegando
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExitIntentPopup;
