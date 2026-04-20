import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para telemetria de acessos.
 * Robustecido com try/catch e validação de dados para evitar quebras no app.
 */
export const useTelemetry = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      try {
        const path = location.pathname;
        const timestamp = new Date().toISOString();
        const sessionKey = "implotter_telemetry_v1";

        // Pegar dados atuais do localStorage com verificação de tipo
        let data: any = { visits: [], products: {} };
        const rawData = localStorage.getItem(sessionKey);
        
        if (rawData) {
          try {
            const parsed = JSON.parse(rawData);
            if (parsed && typeof parsed === 'object') {
              data = parsed;
              if (!Array.isArray(data.visits)) data.visits = [];
              if (!data.products || typeof data.products !== 'object') data.products = {};
            }
          } catch (e) {
            console.warn("Telemetry data corrupted, resetting.");
          }
        }

        // Registrar visita à página
        data.visits.push({ path, timestamp });
        
        // Se for um produto, incrementar contador específico (formato /loja/slug ou /produto/slug)
        if (path.includes("/loja/") || path.includes("/produto/")) {
          const parts = path.split("/");
          const slug = parts[parts.length - 1];
          if (slug && slug !== "loja" && slug !== "produto") {
            data.products[slug] = (data.products[slug] || 0) + 1;
          }
        }

        // Limitar tamanho do buffer local
        if (data.visits.length > 50) {
          data.visits = data.visits.slice(-50);
        }

        localStorage.setItem(sessionKey, JSON.stringify(data));

        // Sincronização básica com o banco (20% de probabilidade)
        if (Math.random() > 0.8) {
          const totalVisitsKey = `stats_visits_${new Date().toISOString().split('T')[0]}`;
          
          const { data: currentStat } = await supabase
            .from("site_settings")
            .select("value")
            .eq("key", totalVisitsKey)
            .maybeSingle();

          const currentCount = currentStat?.value ? parseInt(currentStat.value) : 0;
          
          await supabase.from("site_settings").upsert({
            key: totalVisitsKey,
            value: (currentCount + 1).toString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'key' });
        }
      } catch (err) {
        // Falhas na telemetria NUNCA devem derrubar o site
        console.error("Critical Telemetry Error:", err);
      }
    };

    trackVisit();
  }, [location.pathname]);
};

export const TelemetryTracker = () => {
  useTelemetry();
  return null;
};
