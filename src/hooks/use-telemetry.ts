import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para telemetria de acessos.
 * Como não temos uma tabela específica de analytics, 
 * usamos um sistema de buffer em localStorage e persistimos em site_settings ou logs.
 */
export const useTelemetry = () => {
  const location = useLocation();

  useEffect(() => {
    const trackVisit = async () => {
      const path = location.pathname;
      const timestamp = new Date().toISOString();
      const sessionKey = "implotter_telemetry_v1";

      // Pegar dados atuais do localStorage
      const rawData = localStorage.getItem(sessionKey);
      const data = rawData ? JSON.parse(rawData) : { visits: [], products: {} };

      // Registrar visita à página
      data.visits.push({ path, timestamp });
      
      // Se for um produto, incrementar contador específico
      if (path.startsWith("/produto/")) {
        const slug = path.replace("/produto/", "");
        data.products[slug] = (data.products[slug] || 0) + 1;
      }

      // Limitar tamanho do buffer local
      if (data.visits.length > 50) {
        data.visits = data.visits.slice(-50);
      }

      localStorage.setItem(sessionKey, JSON.stringify(data));

      // Sincronização básica com o banco (usando site_settings como repositório temporário de métricas globais)
      // Nota: Em um cenário real, usaríamos uma tabela dedicated, mas aqui adaptamos ao schema existente.
      try {
        if (Math.random() > 0.8) { // Sincroniza 20% das vezes para economizar requisições
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
        console.warn("Telemetry sync failed", err);
      }
    };

    trackVisit();
  }, [location.pathname]);
};

export const TelemetryTracker = () => {
  useTelemetry();
  return null;
};
