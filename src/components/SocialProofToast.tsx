import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";

interface ProofMessage {
  customer_name: string;
  city: string | null;
  message: string;
}

const SocialProofToast = () => {
  const [current, setCurrent] = useState<ProofMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const msgsRef = useRef<ProofMessage[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("social_proof_messages")
        .select("customer_name, city, message")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!data || data.length === 0) return;
      msgsRef.current = data as ProofMessage[];

      const timer = setTimeout(() => showNext(), 8000);
      return () => clearTimeout(timer);
    };
    load();
  }, []);

  const showNext = () => {
    if (msgsRef.current.length === 0) return;
    const msg = msgsRef.current[indexRef.current % msgsRef.current.length];
    indexRef.current++;
    setCurrent(msg);
    setVisible(true);

    setTimeout(() => setVisible(false), 5000);
    const nextDelay = 25000 + Math.random() * 20000;
    setTimeout(() => showNext(), nextDelay);
  };

  return (
    <AnimatePresence>
      {visible && current && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-24 left-4 z-40 max-w-xs"
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-elevated p-4 flex items-start gap-3 cursor-pointer hover:shadow-glow transition-shadow"
            onClick={() => setVisible(false)}
          >
            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-5 h-5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {current.customer_name}
                {current.city && (
                  <span className="text-muted-foreground font-normal"> de {current.city}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {current.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialProofToast;
