import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Star, Gift, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

interface LoyaltyInfo {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  history: { points: number; type: string; description: string | null; created_at: string }[];
}

const POINTS_PER_REAL = 1; // 1 point per R$1 spent

const LoyaltyWidget = () => {
  const { user } = useAuth();
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const { data: points } = await supabase
        .from("loyalty_points")
        .select("points, type, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!points) return;

      let totalEarned = 0;
      let totalRedeemed = 0;
      points.forEach((p) => {
        if (p.type === "earn") totalEarned += p.points;
        else totalRedeemed += p.points;
      });

      setInfo({
        balance: totalEarned - totalRedeemed,
        totalEarned,
        totalRedeemed,
        history: points,
      });
    };

    load();
  }, [user]);

  if (!user || !info) return null;

  const redeemValue = (info.balance * 0.01).toFixed(2); // 100 points = R$1

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
          <Star className="w-6 h-6 text-gold" />
        </div>
        <div>
          <h3 className="font-display font-bold text-foreground">Programa de Fidelidade</h3>
          <p className="text-xs text-muted-foreground">A cada R$1 gasto = {POINTS_PER_REAL} ponto</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <p className="font-display font-bold text-xl text-gold">{info.balance}</p>
          <p className="text-[10px] text-muted-foreground">Saldo</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <p className="font-display font-bold text-xl text-success">{info.totalEarned}</p>
          <p className="text-[10px] text-muted-foreground">Ganhos</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 text-center">
          <p className="font-display font-bold text-xl text-foreground">R$ {redeemValue}</p>
          <p className="text-[10px] text-muted-foreground">Disponível</p>
        </div>
      </div>

      {info.balance >= 100 && (
        <div className="flex items-center gap-2 bg-gold/10 rounded-xl p-3 border border-gold/20">
          <Gift className="w-4 h-4 text-gold flex-shrink-0" />
          <p className="text-xs text-foreground">
            Você pode resgatar <strong>R$ {redeemValue}</strong> em desconto no próximo pedido!
          </p>
        </div>
      )}

      {info.history.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {info.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-3 h-3 ${h.type === "earn" ? "text-success" : "text-destructive"}`} />
                  <span className="text-foreground">{h.description || (h.type === "earn" ? "Pontos ganhos" : "Resgate")}</span>
                </div>
                <span className={`font-semibold ${h.type === "earn" ? "text-success" : "text-destructive"}`}>
                  {h.type === "earn" ? "+" : "-"}{h.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyWidget;
