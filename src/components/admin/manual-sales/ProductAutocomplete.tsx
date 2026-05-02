import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Package, Box, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface ProductData {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  pricing_type: 'fixed' | 'per_sqm';
  type: 'product' | 'kit';
}

interface ProductAutocompleteProps {
  onSelect: (product: ProductData) => void;
  placeholder?: string;
}

const ProductAutocomplete = ({ onSelect, placeholder = "Buscar produto ou kit..." }: ProductAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProductData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const searchProducts = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    
    try {
      // 1. Search in Products
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, price, sale_price, pricing_type")
        .ilike("name", `%${term}%`)
        .eq("is_active", true)
        .limit(10);

      // 2. Search in Kits
      const { data: kits } = await supabase
        .from("kits")
        .select("id, name, normal_price, promo_price")
        .ilike("name", `%${term}%`)
        .eq("is_active", true)
        .limit(5);

      const consolidated: ProductData[] = [
        ...(prods || []).map(p => ({
          id: p.id,
          name: p.name,
          price: p.price,
          sale_price: p.sale_price,
          pricing_type: p.pricing_type as any,
          type: 'product' as const
        })),
        ...(kits || []).map(k => ({
          id: k.id,
          name: `[KIT] ${k.name}`,
          price: k.normal_price,
          sale_price: k.promo_price,
          pricing_type: 'fixed' as const,
          type: 'kit' as const
        }))
      ].sort((a, b) => a.name.localeCompare(b.name));

      setResults(consolidated);
    } catch (error) {
      console.error("Erro ao buscar produtos:", error);
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
                searchProducts(e.target.value);
                if (e.target.value.length >= 2) setOpen(true);
              }}
              placeholder={placeholder}
              className="pl-10 h-10 border-glow focus-visible:ring-highlight bg-background/50"
            />
            {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command className="border-none shadow-none">
            <CommandList className="max-h-[300px]">
              <CommandEmpty>{loading ? "Buscando..." : "Nenhum produto encontrado."}</CommandEmpty>
              <CommandGroup heading="Produtos e Kits">
                {results.map((res) => (
                  <CommandItem
                    key={`${res.type}-${res.id}`}
                    onSelect={() => {
                      onSelect(res);
                      setSearchTerm(res.name);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between p-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {res.type === 'product' ? (
                        <Package className="w-4 h-4 text-primary" />
                      ) : (
                        <Box className="w-4 h-4 text-purple-500" />
                      )}
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{res.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {res.pricing_type === 'per_sqm' ? 'Preço por m²' : 'Preço Fixo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-primary">
                        R$ {(res.sale_price || res.price).toFixed(2)}
                      </span>
                      {res.sale_price && (
                        <span className="text-[10px] line-through text-muted-foreground">
                          R$ {res.price.toFixed(2)}
                        </span>
                      )}
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

export default ProductAutocomplete;
