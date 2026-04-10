import { useEffect, useState } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Truck } from "lucide-react";

const settingsKeys = [
  { key: "company_name", label: "Nome da Empresa" },
  { key: "phone", label: "Telefone" },
  { key: "whatsapp", label: "WhatsApp (com código do país)" },
  { key: "email", label: "Email" },
  { key: "address", label: "Endereço" },
  { key: "address_number", label: "Número do Endereço" },
  { key: "neighborhood", label: "Bairro" },
  { key: "city", label: "Cidade" },
  { key: "state", label: "Estado (UF)" },
  { key: "business_hours", label: "Horário de Atendimento" },
  { key: "instagram", label: "Instagram URL" },
  { key: "facebook", label: "Facebook URL" },
  { key: "cnpj", label: "CNPJ da Empresa" },
  { key: "cpf_responsavel", label: "CPF do Responsável (para etiquetas de envio)" },
  { key: "pix_key", label: "Chave PIX" },
  { key: "pix_receiver_name", label: "Nome do Recebedor PIX" },
  { key: "pix_city", label: "Cidade PIX" },
  { key: "active_theme", label: "Tema Ativo (Sazonal)" },
];

const shippingKeys = [
  { key: "shipping_origin_cep", label: "CEP de Origem (seu endereço)" },
  { key: "shipping_default_weight", label: "Peso Padrão (kg)" },
  { key: "shipping_default_height", label: "Altura Padrão (cm)" },
  { key: "shipping_default_width", label: "Largura Padrão (cm)" },
  { key: "shipping_default_length", label: "Comprimento Padrão (cm)" },
];

const allKeys = [...settingsKeys.map(s => s.key), ...shippingKeys.map(s => s.key), "profit_margin_default"];

const AdminConfiguracoes = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("site_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ""; });
      if (!map["profit_margin_default"]) map["profit_margin_default"] = "80";
      setSettings(map);
    });
  }, []);

  const handleSave = async () => {
    for (const key of allKeys) {
      const value = settings[key] || "";
      const { data: existing } = await supabase.from("site_settings").select("id").eq("key", key).maybeSingle();
      if (existing) {
        await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value });
      }
    }
    toast({ title: "Configurações salvas!" });
  };

  return (
    <AdminLayout>
      <h1 className="font-display text-3xl font-bold text-foreground mb-6">Configurações</h1>

      {/* Profit Margin Setting */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card max-w-2xl mb-6">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-success" /> Precificação Automática
        </h2>
        <div>
          <label className="text-sm font-medium text-foreground">Margem de Lucro Padrão (%)</label>
          <p className="text-xs text-muted-foreground mb-1.5">
            Usada para calcular automaticamente o preço de venda sugerido ao cadastrar produtos.
          </p>
          <div className="flex items-center gap-2 max-w-xs">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="1000"
              value={settings["profit_margin_default"] || "80"}
              onChange={e => setSettings(prev => ({ ...prev, profit_margin_default: e.target.value }))}
              className="mt-1"
            />
            <span className="text-lg font-bold text-muted-foreground">%</span>
          </div>
        </div>
      </div>

      {/* Shipping Settings */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card max-w-2xl mb-6">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <Truck className="w-5 h-5 text-highlight" /> Configuração de Frete (Melhor Envio)
        </h2>
        <div className="space-y-4">
          {shippingKeys.map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm font-medium text-foreground">{label}</label>
              <Input
                value={settings[key] || ""}
                onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                className="mt-1"
                placeholder={key === "shipping_origin_cep" ? "00000-000" : ""}
              />
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Configure os valores padrão para cálculo de frete. O CEP de origem é obrigatório.
          </p>
        </div>
      </div>

      {/* Seasonal Theme Setting */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card max-w-2xl mb-6">
        <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary" /> Modo Sazonal Express
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
           {[
              { id: "default", name: "Padrão", color: "bg-primary" },
              { id: "black_friday", name: "Black Friday", color: "bg-slate-900" },
              { id: "natal", name: "Natal & Festas", color: "bg-red-600" },
           ].map(t => (
             <button 
                key={t.id}
                onClick={() => setSettings(prev => ({ ...prev, active_theme: t.id }))}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  settings.active_theme === t.id ? "border-primary bg-primary/5 shadow-glow-sm" : "border-border hover:border-primary/50"
                )}
             >
                <div className={cn("w-10 h-10 rounded-full shadow-inner", t.color)} />
                <span className="text-[10px] font-black uppercase tracking-widest">{t.name}</span>
             </button>
           ))}
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card max-w-2xl space-y-4">
        {settingsKeys.map(({ key, label }) => (
          <div key={key}>
            <label className="text-sm font-medium text-foreground">{label}</label>
            <Input
              value={settings[key] || ""}
              onChange={e => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
              className="mt-1"
            />
          </div>
        ))}
        <Button variant="hero" size="lg" onClick={handleSave} className="w-full">Salvar Configurações</Button>
      </div>
    </AdminLayout>
  );
};

export default AdminConfiguracoes;
