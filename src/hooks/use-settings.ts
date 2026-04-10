import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSettings() {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");
      
      if (error) throw error;
      
      const settings: Record<string, string> = {};
      data.forEach((s) => {
        settings[s.key] = s.value || "";
      });
      return settings;
    },
    staleTime: 1000 * 60 * 10, // Max caching for settings as they change rarely
  });
}
