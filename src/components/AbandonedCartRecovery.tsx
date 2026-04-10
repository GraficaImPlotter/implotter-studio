import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, X, Gift, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const IDLE_TIME = 5 * 60 * 1000; // 5 minutes of inactivity
const STORAGE_KEY = "implotter-cart-recovery-dismissed";

const AbandonedCartRecovery = () => {
  const { items, getSubtotal } = useCart();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60); // 15 min timer

  const dismiss = useCallback(() => {
    setShow(false);
    sessionStorage.setItem(STORAGE_KEY, "1");
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (items.length > 0) setShow(true);
      }, IDLE_TIME);
    };

    const events = ["mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [items.length]);

  // Countdown timer
  useEffect(() => {
    if (!show) return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 0) return 0;
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [show]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const subtotal = getSubtotal();

  return (
    <AnimatePresence>
      {show && items.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === e.currentTarget && dismiss()}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card border border-border rounded-2xl shadow-elevated max-w-md w-full p-6 relative"
          >
            <button
              onClick={dismiss}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-warning" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">
                Você esqueceu algo! 🛒
              </h2>
              <p className="text-muted-foreground text-sm mt-2">
                Você tem <strong className="text-foreground">{items.length} {items.length === 1 ? "item" : "itens"}</strong> esperando no carrinho
              </p>
            </div>

            {/* Items preview */}
            <div className="bg-secondary/50 rounded-xl p-3 mb-4 max-h-32 overflow-y-auto space-y-2">
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  {item.image && (
                    <img src={item.image} alt="" className="w-8 h-8 rounded object-cover" />
                  )}
                  <span className="text-foreground truncate flex-1">{item.name}</span>
                  <span className="text-muted-foreground">x{item.quantity}</span>
                </div>
              ))}
              {items.length > 3 && (
                <p className="text-xs text-muted-foreground text-center">
                  + {items.length - 3} {items.length - 3 === 1 ? "item" : "itens"} a mais
                </p>
              )}
            </div>

            {/* Total + timer */}
            <div className="flex items-center justify-between mb-5 px-1">
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="font-display font-bold text-lg text-foreground">
                  R$ {subtotal.toFixed(2)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-warning">
                <Clock className="w-4 h-4" />
                <span className="font-mono font-bold text-sm">{formatTime(countdown)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="hero" size="lg" asChild className="w-full">
                <Link to="/carrinho" onClick={dismiss}>
                  <Gift className="w-4 h-4" /> Finalizar Pedido
                </Link>
              </Button>
              <button
                onClick={dismiss}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
              >
                Continuar navegando
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AbandonedCartRecovery;
