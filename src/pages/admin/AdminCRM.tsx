import { useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { useAuth } from "@/hooks/use-auth";
import { useCRMProfiles, useCustomerStages, useCRMNotes, useAddCRMNote, useUpdateCustomerStage } from "@/hooks/use-crm";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import CRMClientList from "@/components/admin/crm/CRMClientList";
import CRMNotesSection from "@/components/admin/crm/CRMNotesSection";
import { Users, LayoutList, Kanban, Mail, Phone, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KanbanBoard, KanbanColumn } from "@/components/admin/KanbanBoard";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  novo_contato: "Novo Contato", 
  orcamento_enviado: "Orçamento Enviado",
  aguardando_retorno: "Aguardando Retorno", 
  aprovado: "Aprovado",
  em_producao: "Em Produção", 
  pos_venda: "Pós-Venda",
};

const CRM_COLUMNS: KanbanColumn[] = [
  { id: "novo", title: "Novos Leads", icon: Users, statusKeys: ["novo_contato"], className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { id: "orcamento", title: "Orçamentos", icon: Mail, statusKeys: ["orcamento_enviado"], className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  { id: "aguardando", title: "Follow-up", icon: Phone, statusKeys: ["aguardando_retorno"], className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { id: "aprovado", title: "Ganhos", icon: LayoutList, statusKeys: ["aprovado", "em_producao"], className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { id: "pos_venda", title: "Relacionamento", icon: Users, statusKeys: ["pos_venda"], className: "bg-card text-muted-foreground border-border/50" },
];

const AdminCRM = () => {
  const { user } = useAuth();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");

  // Hooks
  const { data: clients = [], isLoading: isLoadingClients } = useCRMProfiles();
  const { data: stages = {} } = useCustomerStages();
  const { data: notes = [], isLoading: isLoadingNotes } = useCRMNotes(selectedClientId);
  
  const addNoteMutation = useAddCRMNote();
  const updateStageMutation = useUpdateCustomerStage();

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleUpdateStage = (clientId: string, stage: string) => {
    updateStageMutation.mutate({
      clientId,
      stage,
      exists: !!stages[clientId]
    });
  };

  const handleAddNote = (note: string, noteType: string) => {
    if (!selectedClientId) return;
    addNoteMutation.mutate({
      clientId: selectedClientId,
      note,
      noteType,
      createdBy: user?.id
    });
  };

  const renderCRMCard = (client: any) => {
    return (
      <div 
        onClick={() => { setSelectedClientId(client.id); setActiveTab("list"); }}
        className="bg-card border border-white/5 rounded-2xl p-4 shadow-xl hover:border-primary/20 transition-all cursor-pointer group"
      >
        <div className="flex items-center gap-3 mb-3">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-highlight/10 to-transparent border border-highlight/20 flex items-center justify-center font-black text-xs text-highlight">
              {client.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?'}
           </div>
           <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-foreground truncate">{client.full_name || "Sem nome"}</h4>
              <p className="text-[10px] text-muted-foreground truncate">{client.email}</p>
           </div>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
           <div className="flex -space-x-2">
              <div className="w-5 h-5 rounded-full border border-background bg-secondary text-[8px] flex items-center justify-center font-bold">L</div>
              <div className="w-5 h-5 rounded-full border border-background bg-secondary text-[8px] flex items-center justify-center font-bold text-highlight">P</div>
           </div>
           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-black text-primary uppercase tracking-widest">Abrir</span>
              <ExternalLink className="w-3 h-3 text-primary" />
           </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-highlight/10 flex items-center justify-center border-2 border-highlight/20 text-highlight shadow-glow-sm">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <h1 className="font-display text-4xl font-black text-foreground tracking-tighter uppercase">CRM <span className="text-highlight">Pipeline</span></h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">Gestão de contatos & Funil</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-card/50 p-1 rounded-2xl border border-border/50">
          <TabsList className="bg-transparent border-0 gap-1">
            <TabsTrigger value="list" className="rounded-xl px-6 data-[state=active]:bg-highlight data-[state=active]:text-white font-bold text-xs transition-all">
              <LayoutList className="w-3.5 h-3.5 mr-2" /> LISTA
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="rounded-xl px-6 data-[state=active]:bg-highlight data-[state=active]:text-white font-bold text-xs transition-all">
              <Kanban className="w-3.5 h-3.5 mr-2" /> PIPELINE
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={activeTab} className="w-full">
        <TabsContent value="list" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              {isLoadingClients ? (
                <TableSkeleton rows={8} />
              ) : (
                <CRMClientList 
                  clients={clients}
                  stages={stages}
                  selectedClientId={selectedClientId}
                  onSelectClient={setSelectedClientId}
                  onUpdateStage={handleUpdateStage}
                  stageLabels={STAGE_LABELS}
                />
              )}
            </div>

            <div className="lg:col-span-5">
              {selectedClientId && selectedClient ? (
                <CRMNotesSection 
                  clientId={selectedClientId}
                  clientName={selectedClient.full_name || selectedClient.email || "Cliente"}
                  notes={notes}
                  onAddNote={handleAddNote}
                  isAdding={addNoteMutation.isPending}
                />
              ) : (
                <div className="glass-card-premium rounded-3xl border-dashed border-white/5 p-12 shadow-2xl text-center flex flex-col items-center justify-center min-h-[500px]">
                   <div className="w-20 h-20 rounded-[28px] bg-muted/10 flex items-center justify-center mb-6 border border-white/5">
                      <Users className="w-10 h-10 text-muted-foreground opacity-30" />
                   </div>
                   <h3 className="font-display font-black text-xl text-foreground mb-3 uppercase tracking-tight">Timeline do Cliente</h3>
                   <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium leading-relaxed">
                     Selecione um perfil na lista para expandir o histórico de interações e anotações estratégicas.
                   </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="pipeline" className="mt-0 scrollbar-none overflow-x-auto">
           <KanbanBoard
             columns={CRM_COLUMNS}
             items={clients}
             renderCard={renderCRMCard}
             getItemStatus={(c) => stages[c.id] || "novo_contato"}
             getItemId={(c) => c.id}
             onMove={async (id, status) => { handleUpdateStage(id, status); }}
             isLoading={isLoadingClients}
           />
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
};

export default AdminCRM;
