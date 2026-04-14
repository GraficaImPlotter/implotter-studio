import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Truck, Loader2, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ShippingOption {
  id: number;
  name: string;
  company: string;
  price: number;
  discount: number;
  delivery_time: number;
}

interface Props {
  cartTotal: number;
  items: CartItem[];
  onSelect: (option: ShippingOption | null) => void;
  selected: ShippingOption | null;
}

const formatCEP = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
};

/** Aggregate cart items into a single "package" for shipping calc */
const aggregatePackage = (items: CartItem[]) => {
  let totalWeight = 0;
  let maxWidth = 0;
  let maxLength = 0;
  let totalHeight = 0;

  for (const item of items) {
    const qty = item.quantity;
    totalWeight += (item.shippingWeight || 0.3) * qty;
    maxWidth = Math.max(maxWidth, item.shippingWidth || 11);
    maxLength = Math.max(maxLength, item.shippingLength || 16);
    totalHeight += (item.shippingHeight || 2) * qty;
  }

  return {
    peso: Math.max(0.1, totalWeight),
    largura: Math.max(11, maxWidth),
    comprimento: Math.max(16, maxLength),
    altura: Math.max(2, Math.min(100, totalHeight)),
  };
};

const ShippingCalculator = ({ cartTotal, items, onSelect, selected }: Props) => {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [error, setError] = useState("");

  // Fetch company settings for origin CEP
  const { data: companySettings } = useQuery({
    queryKey: ["company-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("company_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    }
  });

  const calculate = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("CEP inválido. Digite 8 números.");
      return;
    }

    setLoading(true);
    setError("");
    setOptions([]);
    onSelect(null);

    const originCep = companySettings?.zip_code || companySettings?.address?.match(/\d{5}-?\d{3}/)?.[0] || "01001000";

    try {
      const pkg = aggregatePackage(items);
      const { data, error: fnError } = await supabase.functions.invoke("calculate-shipping", {
        body: { 
          cep_destino: digits, 
          cep_origem: originCep,
          valor: cartTotal, 
          ...pkg 
        },
      });

      if (fnError) {
        console.error("Function error:", fnError);
        throw new Error(fnError.message || "Erro na comunicação com o servidor de frete.");
      }

      if (data?.error) {
        setError(data.details || data.error);
        return;
      }

      const opts: ShippingOption[] = data?.options || [];
      if (opts.length === 0) {
        setError("Nenhuma opção de frete disponível para este CEP.");
        return;
      }
      
      const topOptions = opts.sort((a, b) => a.price - b.price).slice(0, 3);
      setOptions(topOptions);
    } catch (err: any) {
      setError(err.message || "Erro ao calcular frete. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-2">
        <Truck className="w-4 h-4 text-highlight" /> Calcular Frete
      </h3>

      <div className="flex gap-2">
        <Input
          placeholder="00000-000"
          value={cep}
          onChange={(e) => setCep(formatCEP(e.target.value))}
          onKeyDown={(e) => e.key === "Enter" && calculate()}
          className="bg-secondary border-border"
          maxLength={9}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={calculate}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Calcular"}
        </Button>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt) => {
            const isSelected = selected?.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(isSelected ? null : opt)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-highlight bg-highlight/10"
                    : "border-border bg-secondary/50 hover:border-muted-foreground"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {opt.name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="w-3 h-3" /> {opt.company}
                      <span className="mx-1">•</span>
                      <Clock className="w-3 h-3" /> {opt.delivery_time} dias úteis
                    </p>
                  </div>
                  <span className="font-display font-bold text-foreground whitespace-nowrap">
                    R$ {opt.price.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ShippingCalculator;
