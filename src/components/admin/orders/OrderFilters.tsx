import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ORDER_STATUS_LABELS } from "@/lib/order-status";

interface OrderFiltersProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  status: string;
  setStatus: (val: string) => void;
  dateFrom: string;
  setDateFrom: (val: string) => void;
  dateTo: string;
  setDateTo: (val: string) => void;
}

const OrderFilters = ({
  searchTerm,
  setSearchTerm,
  status,
  setStatus,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
}: OrderFiltersProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por nome, email ou ID..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 bg-background/50 focus:bg-background transition-colors"
        />
      </div>
      <select 
        value={status} 
        onChange={e => setStatus(e.target.value)} 
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
      >
        <option value="">Todos os Status</option>
        {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <Input 
        type="date" 
        value={dateFrom} 
        onChange={(e) => setDateFrom(e.target.value)} 
        className="text-sm bg-background/50 focus:bg-background transition-colors"
      />
      <Input 
        type="date" 
        value={dateTo} 
        onChange={(e) => setDateTo(e.target.value)} 
        className="text-sm bg-background/50 focus:bg-background transition-colors"
      />
    </div>
  );
};

export default OrderFilters;
