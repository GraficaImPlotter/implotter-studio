import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSiteSettings = () => {
  return useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("key, value");
      if (error) throw error;
      
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ""; });
      return map;
    },
  });
};
