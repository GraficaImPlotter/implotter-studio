import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Search, Upload, Receipt, FileText, ExternalLink, Calculator, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CustomerAutocomplete from "./CustomerAutocomplete";
import CustomerPurchaseHistory from "./CustomerPurchaseHistory";
import { formatCep, formatPhone, formatCpfCnpj } from "@/lib/utils";
import { useCallback } from "react";
import ProductAutocomplete from "./ProductAutocomplete";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface SaleItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  width?: number;
  height?: number;
  area?: number;
  pricingType?: 'fixed' | 'per_sqm';
  instructions?: string;
}

interface ManualSalesFormProps {
  editingOrder?: any;
  onSuccess: () => void;
}

const emptyItem = (): SaleItem => ({ 
  productId: null, 
  name: "", 
  quantity: 1, 
  unitPrice: 0, 
  discount: 0,
  width: 0,
  height: 0,
  area: 0,
  pricingType: 'fixed',
  instructions: ""
});

const ManualSalesForm = ({ editingOrder, onSuccess }: ManualSalesFormProps) => {
  const { toast } = useToast();
  
  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerCpfCnpj, setCustomerCpfCnpj] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [status, setStatus] = useState("aguardando_pagamento");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<SaleItem[]>([emptyItem()]);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  
  const [allFinishings, setAllFinishings] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerms, setSearchTerms] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const pixInputRef = useRef<HTMLInputElement>(null);
  const nfInputRef = useRef<HTMLInputElement>(null);

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      const [{ data: prods }, { data: kts }, { data: fins }] = await Promise.all([
        supabase.from("products").select("id, name, price, sale_price, pricing_type").eq("is_active", true),
        supabase.from("kits").select("id, name, normal_price, promo_price").eq("is_active", true),
        supabase.from("finishings").select("*").eq("is_active", true).order("sort_order")
      ]);
      const combined = [
        ...(prods || []).map(p => ({ ...p, type: 'product' })),
        ...(kts || []).map(k => ({ id: k.id, name: `[KIT] ${k.name}`, price: k.normal_price, sale_price: k.promo_price, type: 'kit', pricing_type: 'fixed' }))
      ].sort((a, b) => a.name.localeCompare(b.name));
      setProducts(combined);
      setAllFinishings(fins || []);
    };
    loadProducts();

    if (editingOrder) {
      setCustomerName(editingOrder.customer_name || "");
      setCustomerEmail(editingOrder.customer_email?.includes("@implotter.local") ? "" : (editingOrder.customer_email || ""));
      setCustomerPhone(editingOrder.customer_phone || "");
      setCustomerCpfCnpj(editingOrder.customer_cpf_cnpj || "");
      setAddressZip(editingOrder.address_zip || "");
      setAddressStreet(editingOrder.address_street || "");
      setAddressNumber(editingOrder.address_number || "");
      setAddressComplement(editingOrder.address_complement || "");
      setAddressNeighborhood(editingOrder.address_neighborhood || "");
      setAddressCity(editingOrder.address_city || "");
      setAddressState(editingOrder.address_state || "");
      setPaymentMethod(editingOrder.payment_method || "pix");
      setStatus(editingOrder.status || "aguardando_pagamento");
      setNotes(editingOrder.notes || "");
      setGlobalDiscount(Number(editingOrder.discount) || 0);
      
      // Load items
      supabase.from("order_items").select("*").eq("order_id", editingOrder.id).then(({ data }) => {
        if (data && data.length > 0) {
          setItems(data.map((oi: any) => ({
            productId: oi.product_id || null,
            name: oi.product_name,
            quantity: oi.quantity,
            unitPrice: Number(oi.unit_price),
            discount: 0,
            width: oi.item_width || 0,
            height: oi.item_height || 0,
            area: oi.item_area || 0,
            pricingType: (oi.pricing_type as any) || 'fixed',
            instructions: oi.instructions || "",
          })));
        }
      });
    }
  }, [editingOrder]);

  const subtotal = items.reduce((sum, it) => {
    let itemPrice = it.unitPrice;
    if (it.pricingType === 'per_sqm' && it.width && it.height) {
      itemPrice = it.unitPrice * (it.width * it.height);
    }
    const lineTotal = itemPrice * it.quantity;
    const lineDiscount = lineTotal * (it.discount / 100);
    return sum + lineTotal - lineDiscount;
  }, 0);

  const total = Math.max(0, subtotal - globalDiscount);

  const lookupCep = useCallback(async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddressStreet(data.logradouro || "");
        setAddressNeighborhood(data.bairro || "");
        setAddressCity(data.localidade || "");
        setAddressState(data.uf || "");
      }
    } catch { /* ignore */ }
  }, []);

  const lookupCnpj = useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 14) return;
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      const data = await res.json();
      if (data.razao_social) {
        setCustomerName(data.razao_social);
        if (data.cep) {
          setAddressZip(data.cep);
          setAddressStreet(data.logradouro || "");
          setAddressNumber(data.numero || "");
          setAddressComplement(data.complemento || "");
          setAddressNeighborhood(data.bairro || "");
          setAddressCity(data.municipio || "");
          setAddressState(data.uf || "");
        }
      }
    } catch { /* ignore */ }
  }, []);

  const handleCustomerSelect = (customer: any) => {
    setCustomerName(customer.name);
    setCustomerEmail(customer.email);
    setCustomerPhone(customer.phone);
    setCustomerCpfCnpj(customer.cpf_cnpj);
    
    if (customer.address_zip) {
      setAddressZip(customer.address_zip);
      setAddressStreet(customer.address_street || "");
      setAddressNumber(customer.address_number || "");
      setAddressComplement(customer.address_complement || "");
      setAddressNeighborhood(customer.address_neighborhood || "");
      setAddressCity(customer.address_city || "");
      setAddressState(customer.address_state || "");
    }

    toast({
      title: "Cliente Selecionado",
      description: `Dados de ${customer.name} carregados com sucesso.`,
      variant: "default",
    });
  };

  const updateItem = (idx: number, patch: Partial<SaleItem>) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, ...patch };
      
      // Calculate area if width/height changed
      if (updated.pricingType === 'per_sqm' && (patch.width !== undefined || patch.height !== undefined)) {
        updated.area = (updated.width || 0) * (updated.height || 0);
      }
      
      return updated;
    }));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.length <= 1 ? [emptyItem()] : prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    const validItems = items.filter(it => it.name.trim());
    if (validItems.length === 0) {
      toast({ title: "Adicione pelo menos um item", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        customer_name: customerName,
        customer_email: customerEmail || `manual-${Date.now()}@implotter.local`,
        customer_phone: customerPhone || null,
        customer_cpf_cnpj: customerCpfCnpj || null,
        address_zip: addressZip || null,
        address_street: addressStreet || null,
        address_number: addressNumber || null,
        address_complement: addressComplement || null,
        address_neighborhood: addressNeighborhood || null,
        address_city: addressCity || null,
        address_state: addressState || null,
        subtotal: Math.round(subtotal * 100) / 100,
        discount: Math.round(globalDiscount * 100) / 100,
        total: Math.round(total * 100) / 100,
        payment_method: paymentMethod,
        status: status as any,
        notes: notes || null,
      };

      let orderId: string;
      if (editingOrder) {
        const { error } = await supabase.from("orders").update(orderPayload).eq("id", editingOrder.id);
        if (error) throw error;
        orderId = editingOrder.id;
        await supabase.from("order_items").delete().eq("order_id", orderId);
      } else {
        const { data: order, error: orderError } = await supabase.from("orders").insert([{
          ...orderPayload,
          origin: "manual",
        }]).select().single();
        if (orderError) throw orderError;
        orderId = order.id;
        
        await supabase.from("order_status_history").insert([{
          order_id: orderId,
          status: status as any,
          notes: "Venda manual registrada",
        }]);
      }

      const orderItems = validItems.map(it => {
        const itemArea = it.pricingType === 'per_sqm' ? (it.width || 0) * (it.height || 0) : null;
        const itemSubtotal = it.pricingType === 'per_sqm' 
          ? (it.unitPrice * (itemArea || 0) * it.quantity) 
          : (it.unitPrice * it.quantity);

        return {
          order_id: orderId,
          product_id: it.productId || null,
          product_name: it.name,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          pricing_type: it.pricingType || 'fixed',
          item_width: it.width || null,
          item_height: it.height || null,
          item_area: itemArea,
          instructions: it.instructions || null,
          subtotal: Math.round(itemSubtotal * (1 - it.discount / 100) * 100) / 100,
        };
      });
      await supabase.from("order_items").insert(orderItems);

      toast({ title: editingOrder ? "Venda atualizada!" : "Venda registrada!" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const uploadDocument = async (field: "pix_receipt_url" | "invoice_url", file: File) => {
    if (!editingOrder) return;
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      toast({ title: "Arquivo inválido", description: validation.error, variant: "destructive" });
      return;
    }

    setUploadingDoc(field);
    try {
      const ext = file.name.split('.').pop();
      const filePath = `orders/${editingOrder.id}/${field}_${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath);
      await supabase.from("orders").update({ [field]: publicUrl }).eq("id", editingOrder.id);
      
      toast({ title: "Documento anexado!" });
      onSuccess();
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingDoc(null);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Seção Cliente */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <UserCheck className="w-4 h-4 text-primary" />
          <span>Informações do Cliente</span>
        </div>
        
        <CustomerAutocomplete onSelect={handleCustomerSelect} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label>Nome Completo / Razão Social</Label>
            <Input value={customerName} onChange={e => setCustomerName(e.target.value)} required placeholder="Nome do cliente..." />
          </div>
          <div className="space-y-2">
            <Label>CPF / CNPJ</Label>
            <Input 
              value={customerCpfCnpj} 
              onChange={e => {
                const val = e.target.value;
                setCustomerCpfCnpj(val);
                if (val.replace(/\D/g, "").length === 14) lookupCnpj(val);
              }} 
              placeholder="Opcional..." 
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="exemplo@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Telefone / WhatsApp</Label>
            <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        </div>

        {/* Endereço */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input 
              value={addressZip} 
              onChange={e => {
                const val = e.target.value;
                setAddressZip(val);
                if (val.replace(/\D/g, "").length === 8) lookupCep(val);
              }} 
              placeholder="00000-000" 
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Logradouro</Label>
            <Input value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="Rua, Avenida..." />
          </div>
          <div className="space-y-2">
            <Label>Número</Label>
            <Input value={addressNumber} onChange={e => setAddressNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Bairro</Label>
            <Input value={addressNeighborhood} onChange={e => setAddressNeighborhood(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cidade/UF</Label>
            <div className="flex gap-2">
              <Input value={addressCity} onChange={e => setAddressCity(e.target.value)} className="flex-1" />
              <Input value={addressState} onChange={e => setAddressState(e.target.value)} className="w-16 uppercase" maxLength={2} />
            </div>
          </div>
        </div>

        {/* Histórico rápido do cliente */}
        <CustomerPurchaseHistory customerEmail={customerEmail} customerCpfCnpj={customerCpfCnpj} />
      </div>

      {/* Seção Itens */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Calculator className="w-4 h-4 text-primary" />
            <span>Itens do Pedido</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems([...items, emptyItem()])}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Item
          </Button>
        </div>

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="glass-card p-4 rounded-xl space-y-4 relative overflow-hidden group border-glow/30">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-12 lg:col-span-5 space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Produto / Serviço</Label>
                  <ProductAutocomplete 
                    onSelect={(prod) => updateItem(idx, { 
                      productId: prod.id, 
                      name: prod.name, 
                      unitPrice: prod.sale_price || prod.price,
                      pricingType: prod.pricing_type as any
                    })} 
                    placeholder="Buscar no sistema ou digitar nome..."
                  />
                  <Input 
                    value={item.name} 
                    onChange={e => updateItem(idx, { name: e.target.value, productId: null })} 
                    placeholder="Nome customizado..." 
                    className="mt-1.5 bg-background/30 h-8 text-xs"
                  />
                </div>

                {item.pricingType === 'per_sqm' && (
                  <>
                    <div className="md:col-span-3 lg:col-span-1 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">Larg (m)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={item.width} 
                        onChange={e => updateItem(idx, { width: parseFloat(e.target.value) || 0 })} 
                        className="bg-background/50"
                      />
                    </div>
                    <div className="md:col-span-3 lg:col-span-1 space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">Alt (m)</Label>
                      <Input 
                        type="number" 
                        step="0.01"
                        value={item.height} 
                        onChange={e => updateItem(idx, { height: parseFloat(e.target.value) || 0 })} 
                        className="bg-background/50"
                      />
                    </div>
                    <div className="md:col-span-3 lg:col-span-1 space-y-1.5 hidden lg:block">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold">Área (m²)</Label>
                      <div className="h-10 flex items-center px-3 rounded-md bg-muted/30 text-xs font-mono">
                        {((item.width || 0) * (item.height || 0)).toFixed(2)}
                      </div>
                    </div>
                  </>
                )}

                <div className="md:col-span-2 lg:col-span-1 space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Qtd</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={item.quantity} 
                    onChange={e => updateItem(idx, { quantity: parseInt(e.target.value) || 1 })} 
                    className="bg-background/50"
                  />
                </div>
                <div className="md:col-span-4 lg:col-span-2 space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">
                    {item.pricingType === 'per_sqm' ? 'Vlr m² (R$)' : 'Vlr Unit (R$)'}
                  </Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    value={item.unitPrice} 
                    onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })} 
                    className="bg-background/50"
                  />
                </div>
                <div className="md:col-span-4 lg:col-span-2 flex items-center justify-between gap-2 h-full pt-6">
                  <div className="text-right flex-1">
                    <p className="text-[10px] uppercase text-muted-foreground">Total Item</p>
                    <p className="font-bold text-primary">
                      R$ {(item.pricingType === 'per_sqm' 
                        ? (item.unitPrice * (item.width || 0) * (item.height || 0) * item.quantity)
                        : (item.unitPrice * item.quantity)
                      ).toFixed(2)}
                    </p>
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="text-destructive hover:bg-destructive/10" 
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Acabamentos e Instruções */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/30">
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold italic">Acabamento Sugerido</Label>
                  <Select 
                    onValueChange={(val) => {
                      const current = item.instructions || "";
                      updateItem(idx, { instructions: current ? `${current}, ${val}` : val });
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background/30">
                      <SelectValue placeholder="Selecionar acabamento..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allFinishings.map(f => (
                        <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Instruções Extras / Acabamentos</Label>
                  <Input 
                    value={item.instructions} 
                    onChange={e => updateItem(idx, { instructions: e.target.value })} 
                    placeholder="Ex: Ilhós a cada 20cm, Refile, Bainha..." 
                    className="h-8 text-xs bg-background/30"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totais e Pagamento */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-6 rounded-2xl border border-border/50">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Forma de Pagamento</Label>
            <select 
              value={paymentMethod} 
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="pix">PIX</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="boleto">Boleto</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Status do Pedido</Label>
            <select 
              value={status} 
              onChange={e => setStatus(e.target.value)}
              className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="pedido_recebido">Recebido</option>
              <option value="aguardando_pagamento">Aguardando Pagamento</option>
              <option value="pagamento_confirmado">Pagamento Confirmado / Produção</option>
              <option value="finalizado">Finalizado / Entregue</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Observações Internas</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Instruções de produção, frete, etc..." className="bg-background/50" />
          </div>
        </div>

        <div className="flex flex-col justify-between bg-card p-6 rounded-xl border border-border shadow-sm">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal dos Itens</span>
              <span className="font-medium text-foreground">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">Desconto Global (R$)</span>
              <Input 
                type="number" 
                step="0.01" 
                className="w-24 text-right h-8" 
                value={globalDiscount} 
                onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)} 
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-border mt-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-foreground">Valor Total</span>
              <span className="text-2xl font-black text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anexos (somente edição) */}
      {editingOrder && (
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <div className="text-sm font-bold flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Anexos e Documentos
          </div>
          <div className="flex flex-wrap gap-3">
            <input type="file" ref={pixInputRef} className="hidden" onChange={e => e.target.files?.[0] && uploadDocument("pix_receipt_url", e.target.files[0])} />
            <input type="file" ref={nfInputRef} className="hidden" onChange={e => e.target.files?.[0] && uploadDocument("invoice_url", e.target.files[0])} />
            
            <Button type="button" variant="outline" size="sm" onClick={() => pixInputRef.current?.click()} disabled={!!uploadingDoc}>
              {uploadingDoc === "pix_receipt_url" ? "Enviando..." : editingOrder.pix_receipt_url ? "Ver/Trocar Recibo PIX" : "Anexar Recibo PIX"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => nfInputRef.current?.click()} disabled={!!uploadingDoc}>
              {uploadingDoc === "invoice_url" ? "Enviando..." : editingOrder.invoice_url ? "Ver/Trocar Nota Fiscal" : "Anexar Nota Fiscal"}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" variant="hero" className="flex-1 h-12 text-lg font-bold shadow-glow" disabled={submitting}>
          {submitting ? "Salvando..." : editingOrder ? "Salvar Alterações" : "Finalizar e Registrar Venda"}
        </Button>
      </div>
    </form>
  );
};

export default ManualSalesForm;
