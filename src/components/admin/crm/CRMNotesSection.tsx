import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, Calendar, User, Send, Filter } from "lucide-react";

interface CRMNotesSectionProps {
  clientId: string;
  clientName: string;
  notes: any[];
  onAddNote: (note: string, type: string) => void;
  isAdding: boolean;
}

const CRMNotesSection = ({
  clientId,
  clientName,
  notes,
  onAddNote,
  isAdding,
}: CRMNotesSectionProps) => {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    onAddNote(fd.get("note") as string, fd.get("note_type") as string);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-6 shadow-card border-gradient-premium relative overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
      
      <div className="shrink-0 mb-6">
        <h3 className="font-display font-bold text-foreground text-xl flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center text-highlight border border-highlight/20">
              <MessageSquare className="w-5 h-5" />
           </div>
           Histórico de Notas
        </h3>
        <p className="text-muted-foreground text-xs mt-1 font-medium uppercase tracking-widest opacity-70">Cliente: <span className="text-foreground">{clientName}</span></p>
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 space-y-4 mb-8 bg-muted/30 p-4 rounded-2xl border border-border/50">
        <div className="flex items-center gap-2">
           <Filter className="w-3.5 h-3.5 text-muted-foreground" />
           <select 
            name="note_type" 
            className="flex-1 rounded-lg border border-input bg-background/50 px-3 py-1.5 text-xs font-bold uppercase tracking-tight outline-none focus:ring-2 focus:ring-primary/20 transition-all"
           >
            <option value="general">Geral</option>
            <option value="atendimento">Atendimento</option>
            <option value="orcamento">Orçamento</option>
            <option value="follow_up">Follow-up</option>
          </select>
        </div>
        <Textarea 
          name="note" 
          placeholder="Diga algo sobre este cliente..." 
          rows={3} 
          required 
          className="bg-background/50 focus:bg-background border-border/50 rounded-xl resize-none text-sm transition-all"
        />
        <Button 
          type="submit" 
          variant="highlight" 
          className="w-full rounded-xl font-bold uppercase tracking-widest text-xs h-10 shadow-glow" 
          disabled={isAdding}
        >
          {isAdding ? "Adicionando..." : "Registrar Nota"} <Send className="w-3.5 h-3.5 ml-2" />
        </Button>
      </form>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
        {notes.map(n => (
          <div key={n.id} className="relative pl-6 border-l-2 border-highlight/30 py-1 transition-all hover:border-highlight group">
            <div className="absolute -left-[5px] top-2.5 w-2 h-2 rounded-full bg-highlight/20 border border-highlight/50 group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider bg-highlight/10 text-highlight px-2 py-0.5 rounded">
                {n.note_type}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                <Calendar className="w-3 h-3" /> {new Date(n.created_at).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed">{n.note}</p>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
             <MessageSquare className="w-12 h-12 mb-3" />
             <p className="text-sm font-medium">Sem registros para este cliente ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMNotesSection;
