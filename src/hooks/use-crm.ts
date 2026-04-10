import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useCRMProfiles = () => {
  return useQuery({
    queryKey: ["crm-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useCustomerStages = () => {
  return useQuery({
    queryKey: ["customer-stages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customer_stages").select("*");
      if (error) throw error;
      
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.customer_id] = s.stage; });
      return map;
    },
  });
};

export const useCRMNotes = (clientId: string | null) => {
  return useQuery({
    queryKey: ["crm-notes", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      if (!clientId) return [];
      const { data, error } = await supabase
        .from("crm_notes")
        .select("*")
        .eq("customer_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useAddCRMNote = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, note, noteType, createdBy }: { clientId: string; note: string; noteType: string; createdBy?: string }) => {
      const { error } = await supabase.from("crm_notes").insert([{ 
        customer_id: clientId, 
        note, 
        note_type: noteType, 
        created_by: createdBy 
      }]);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["crm-notes", variables.clientId] });
      toast({ title: "Nota adicionada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao adicionar nota", description: error.message, variant: "destructive" });
    },
  });
};

export const useUpdateCustomerStage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ clientId, stage, exists }: { clientId: string; stage: string; exists: boolean }) => {
      if (exists) {
        const { error } = await supabase
          .from("customer_stages")
          .update({ stage: stage as any, updated_at: new Date().toISOString() })
          .eq("customer_id", clientId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("customer_stages")
          .insert([{ customer_id: clientId, stage: stage as any }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-stages"] });
      toast({ title: "Etapa atualizada" });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar etapa", description: error.message, variant: "destructive" });
    },
  });
};
