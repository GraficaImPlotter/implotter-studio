import { useCart } from "@/hooks/use-cart";
import { ShoppingCart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export const FloatingCart = () => {
  const { items } = useCart();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);

  if (count === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0, opacity: 0, y: 20 }}
        className="fixed bottom-[224px] right-6 z-50"
      >
        <Link to="/carrinho">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="glass-card-premium p-4 rounded-full relative group cursor-pointer animate-glow-pulse border-gradient-premium shadow-xl"
          >
            <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <ShoppingCart className="w-6 h-6 text-foreground" />
            <motion.span
              key={count}
              initial={{ scale: 1.5, backgroundColor: "hsl(var(--primary))" }}
              animate={{ scale: 1, backgroundColor: "hsl(var(--highlight))" }}
              className="absolute -top-1 -right-1 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg border border-white/20"
            >
              {count}
            </motion.span>
          </motion.div>
        </Link>
      </motion.div>
    </AnimatePresence>
  );
};
