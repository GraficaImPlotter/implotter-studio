import { useMemo, useState, useEffect } from "react";
import { z } from "zod";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Clock, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PopupOffer {
  id: string;
  title: string;
  description: string;
  coupon_code: string;
  discount_label: string;
  timer_minutes: number;
  delay_seconds: number;
  trigger_type: string;
  target_pages: string[] | null;
  require_lead_capture: boolean | null;
}

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome").max(80, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
});

const OfferPopup = () => {
  const [open, setOpen] = useState(false);
  const [offer, setOffer] = useState<PopupOffer | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [savingLead, setSavingLead] = useState(false);

  const { toast } = useToast();

  const pathname = useMemo(() => {
    try {
      return window.location.pathname || "/";
    } catch {
      return "/";
    }
  }, []);

  useEffect(() => {
    const fetchOffer = async () => {
      const { data } = await supabase
        .from("popup_offers")
        .select("*")
        .eq("is_active", true)
        .eq("trigger_type", "delay")
        .limit(1)
        .maybeSingle();

      if (!data) return;

      const targetPages = (data.target_pages ?? ["all"]) as string[];
      const targetsAll = targetPages.includes("all");
      const matchesTarget = targetsAll || targetPages.includes(pathname);
      if (!matchesTarget) return;

      const key = `has_seen_offer_${data.id}`;
      if (localStorage.getItem(key)) return;

      const leadKey = `offer_lead_captured_${data.id}`;
      if (localStorage.getItem(leadKey) === "true") setLeadCaptured(true);

      setOffer(data);
      setTimeLeft(data.timer_minutes * 60);

      const timer = setTimeout(() => {
        setOpen(true);
        localStorage.setItem(key, "true");
      }, data.delay_seconds * 1000);

      return () => clearTimeout(timer);
    };
    fetchOffer();
  }, [pathname]);

  useEffect(() => {
    if (!open || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setOpen(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const captureLead = async () => {
    if (!offer) return;

    const parsed = leadSchema.safeParse({ name: leadName, email: leadEmail });
    if (!parsed.success) {
      toast({ title: parsed.error.issues[0]?.message || "Dados inválidos", variant: "destructive" });
      return;
    }

    setSavingLead(true);
    const { error } = await supabase.from("popup_leads").insert({
      popup_id: offer.id,
      name: parsed.data.name,
      email: parsed.data.email,
    });
    setSavingLead(false);

    if (error) {
      toast({ title: "Não foi possível salvar seus dados", variant: "destructive" });
      return;
    }

    localStorage.setItem(`offer_lead_captured_${offer.id}`, "true");
    setLeadCaptured(true);
    toast({ title: "Perfeito! Aqui está seu cupom." });
  };

  const copyCoupon = async () => {
    if (!offer) return;
    await navigator.clipboard.writeText(offer.coupon_code);

    // Count engagement
    await supabase.rpc("increment_popup_clicks", { popup_id: offer.id });

    toast({
      title: "Cupom copiado!",
      description: `Use ${offer.coupon_code} no carrinho para ${offer.discount_label} de desconto.`,
    });
    setOpen(false);
  };

  if (!offer) return null;

  const shouldCaptureLead = Boolean(offer.require_lead_capture) && !leadCaptured;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md text-center border-2 border-primary/20">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4 w-fit shadow-inner">
            <Ticket className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center">{offer.title}</DialogTitle>
          <DialogDescription className="text-base mt-2 text-center">{offer.description}</DialogDescription>
        </DialogHeader>

        <div className="my-6 p-4 bg-muted/50 rounded-xl flex flex-col items-center justify-center gap-2 border border-border/50">
          <div className="flex items-center gap-2 text-3xl font-mono font-bold text-primary tabular-nums tracking-tight">
            <Clock className="w-6 h-6 animate-pulse" />
            {formatTime(timeLeft)}
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Tempo restante</p>
        </div>

        {shouldCaptureLead ? (
          <div className="grid gap-3 text-left">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome</label>
              <Input value={leadName} onChange={(e) => setLeadName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <Input value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} placeholder="seu@email.com" type="email" />
            </div>
            <Button
              onClick={captureLead}
              variant="hero"
              size="lg"
              className="w-full"
              disabled={savingLead}
            >
              {savingLead ? "Salvando..." : "Quero meu cupom"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground text-xs hover:text-foreground">
              Agora não
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-dashed border-muted-foreground/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-medium">
                <span className="bg-background px-2 text-muted-foreground">Seu Cupom</span>
              </div>
            </div>
            <Button
              onClick={copyCoupon}
              size="xl"
              className="w-full text-lg font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
            >
              <Copy className="w-5 h-5" />
              COPIAR: {offer.coupon_code}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="text-muted-foreground text-xs hover:text-foreground">
              Não, obrigado. Prefiro pagar o valor integral.
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OfferPopup;

