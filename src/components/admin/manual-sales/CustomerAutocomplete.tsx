import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, User, Briefcase, History, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { sanitizeSearchInput } from "@/lib/sanitize-search";

interface CustomerData {
  name: string;
  email: string;
  phone: string;
  cpf_cnpj: string;
  address_zip?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  source: 'profile' | 'lead' | 'order';
}

interface CustomerAutocompleteProps {
  onSelect: (customer: CustomerData) => void;
  placeholder?: string;
}

const CustomerAutocomplete = ({ onSelect, placeholder = "Buscar por nome, CPF, CNPJ, email ou telefone..." }: CustomerAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CustomerData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const searchCustomers = useCallback(async (term: string) => {
    if (term.length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    const safeTerm = sanitizeSearchInput(term);
    
    try {
      // 1. Search in Profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, email, phone, cpf_cnpj")
        .or(`full_name.ilike.%${safeTerm}%,cpf_cnpj.eq.${safeTerm},email.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`)
        .limit(5);

      // 2. Search in Leads
      const { data: leads } = await supabase
        .from("leads")
        .select("name, email, phone")
        .or(`name.ilike.%${safeTerm}%,email.ilike.%${safeTerm}%,phone.ilike.%${safeTerm}%`)
        .limit(5);

      // 3. Search in historical Orders (Manual/Orcamento)
      const { data: orders } = await supabase
        .from("orders")
        .select("customer_name, customer_email, customer_phone, customer_cpf_cnpj, address_zip, address_street, address_number, address_complement, address_neighborhood, address_city, address_state")
        .in("origin", ["manual", "orcamento"])
        .or(`customer_name.ilike.%${safeTerm}%,customer_cpf_cnpj.eq.${safeTerm}%,customer_email.ilike.%${safeTerm}%,customer_phone.ilike.%${safeTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      const consolidated: CustomerData[] = [
        ...(profiles || []).map(p => ({
          name: p.full_name || "",
          email: p.email || "",
          phone: p.phone || "",
          cpf_cnpj: p.cpf_cnpj || "",
          source: 'profile' as const
        })),
        ...(leads || []).map(l => ({
          name: l.name || "",
          email: l.email || "",
          phone: l.phone || "",
          cpf_cnpj: "",
          source: 'lead' as const
        })),
        ...(orders || []).map(o => ({
          name: o.customer_name || "",
          email: o.customer_email || "",
          phone: o.customer_phone || "",
          cpf_cnpj: o.customer_cpf_cnpj || "",
          address_zip: o.address_zip || "",
          address_street: o.address_street || "",
          address_number: o.address_number || "",
          address_complement: o.address_complement || "",
          address_neighborhood: o.address_neighborhood || "",
          address_city: o.address_city || "",
          address_state: o.address_state || "",
          source: 'order' as const
        }))
      ];

      // Remove duplicates based on email or cpf_cnpj or name (preferring high-order sources)
      const unique = consolidated.reduce((acc: CustomerData[], curr) => {
        const exists = acc.find(item => 
          (curr.cpf_cnpj && item.cpf_cnpj === curr.cpf_cnpj) || 
          (curr.email && item.email === curr.email)
        );
        if (!exists) acc.push(curr);
        return acc;
      }, []);

      setResults(unique);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchCustomers(e.target.value);
                if (e.target.value.length >= 3) setOpen(true);
              }}
              placeholder={placeholder}
              className="pl-10 h-11 border-glow focus-visible:ring-highlight bg-muted/20"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="border-none shadow-none">
            <CommandList className="max-h-[300px]">
              <CommandEmpty>{loading ? "Buscando..." : "Nenhum cliente encontrado."}</CommandEmpty>
              <CommandGroup heading="Resultados Sugeridos">
                {results.map((res, i) => (
                  <CommandItem
                    key={`${res.source}-${i}`}
                    onSelect={() => {
                      onSelect(res);
                      setSearchTerm(res.name);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {res.source === 'profile' && <User className="w-4 h-4 text-primary" />}
                        {res.source === 'lead' && <Briefcase className="w-4 h-4 text-warning" />}
                        {res.source === 'order' && <History className="w-4 h-4 text-info" />}
                        <span className="font-semibold text-foreground">{res.name}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize font-normal opacity-70">
                        {res.source === 'profile' ? 'Cliente' : res.source === 'lead' ? 'Lead' : 'Histórico'}
                      </Badge>
                    </div>
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      {res.email && <span className="flex items-center gap-1">{res.email}</span>}
                      {res.cpf_cnpj && <span className="flex items-center gap-1">| {res.cpf_cnpj}</span>}
                      {res.address_city && <span className="flex items-center gap-1">| {res.address_city} - {res.address_state}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default CustomerAutocomplete;
