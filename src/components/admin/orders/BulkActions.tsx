import { Button } from "@/components/ui/button";
import { CheckSquare, Download } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

interface BulkActionsProps {
  selectedCount: number;
  bulkStatus: string;
  setBulkStatus: (val: string) => void;
  handleBulkUpdate: () => void;
  generateBulkPackingSlip: () => void;
}

const BulkActions = ({
  selectedCount,
  bulkStatus,
  setBulkStatus,
  handleBulkUpdate,
  generateBulkPackingSlip,
}: BulkActionsProps) => {
  if (selectedCount === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-primary/5 p-4 rounded-xl border border-primary/20 animate-in fade-in slide-in-from-top-2 shadow-glow-sm">
      <div className="flex items-center gap-2 mr-auto">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
          <CheckSquare className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm font-bold text-primary">{selectedCount} pedidos selecionados</span>
      </div>
      
      <div className="flex items-center gap-2">
        <select 
          value={bulkStatus} 
          onChange={e => setBulkStatus(e.target.value)} 
          className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
        >
          <option value="">Alterar Status...</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <Button 
          size="sm" 
          onClick={handleBulkUpdate} 
          disabled={!bulkStatus}
          className="rounded-lg shadow-sm"
        >
          Aplicar Status
        </Button>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={generateBulkPackingSlip}
          className="rounded-lg border-primary/30 text-primary hover:bg-primary/10"
        >
          <Download className="w-4 h-4 mr-2" /> Gerar Romaneio
        </Button>
      </div>
    </div>
  );
};

export default BulkActions;
