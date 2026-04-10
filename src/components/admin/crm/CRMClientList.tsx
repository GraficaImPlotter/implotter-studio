import { Button } from "@/components/ui/button";
import { User, Mail, ChevronRight } from "lucide-react";

interface CRMClientListProps {
  clients: any[];
  stages: Record<string, string>;
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  onUpdateStage: (clientId: string, stage: string) => void;
  stageLabels: Record<string, string>;
}

const CRMClientList = ({
  clients,
  stages,
  selectedClientId,
  onSelectClient,
  onUpdateStage,
  stageLabels,
}: CRMClientListProps) => {
  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-card border-gradient-premium">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border/50">
            <tr>
              <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Cliente</th>
              <th className="text-left p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Etapa do Funil</th>
              <th className="text-right p-4 font-bold text-muted-foreground text-[10px] uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {clients.map(c => (
              <tr 
                key={c.id} 
                onClick={() => onSelectClient(c.id)}
                className={`group cursor-pointer transition-all ${selectedClientId === c.id ? "bg-primary/5" : "hover:bg-muted/20"}`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-foreground block">{c.full_name || "Sem nome"}</span>
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="w-3 h-3" /> {c.email}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                  <select 
                    value={stages[c.id] || "novo_contato"} 
                    onChange={e => onUpdateStage(c.id, e.target.value)} 
                    className="rounded-lg border border-input bg-background/50 px-3 py-1.5 text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-primary/20 outline-none transition-all cursor-pointer"
                  >
                    {Object.entries(stageLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-right">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`rounded-lg transition-all ${selectedClientId === c.id ? "bg-primary text-white" : "text-muted-foreground"}`}
                   >
                    Notas <ChevronRight className="w-4 h-4 ml-1" />
                   </Button>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="p-12 text-center text-muted-foreground italic">
                  Nenhum cliente encontrado no CRM.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRMClientList;
