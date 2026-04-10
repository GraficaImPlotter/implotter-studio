import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Gift, Sparkles } from "lucide-react";

const STORAGE_KEY = "implotter-scroll-lead-captured";

const ScrollLeadCapture = () => {
  const location = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleScroll = useCallback(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const scrollPct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    if (scrollPct >= 0.7) {
      setOpen(true);
      localStorage.setItem(STORAGE_KEY, "true");
      window.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    const excluded = ["/checkout", "/pagamento", "/login", "/cadastro", "/admin"];
    if (excluded.some(p => location.pathname.startsWith(p))) return;

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [location.pathname, handleScroll]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    await supabase.from("leads").insert({
      name: name.trim(),
      email: email.trim(),
      origin: "scroll_popup",
      subject: "Cupom primeira compra",
    });
    toast({ title: "🎉 Cupom enviado!", description: "Use o código PRIMEIRA10 no checkout para 10% de desconto." });
    setOpen(false);
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2 w-fit">
            <Gift className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Ganhe 10% na primeira compra!</DialogTitle>
          <DialogDescription className="text-center">
            Cadastre-se e receba seu cupom exclusivo de desconto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
          <Input placeholder="Seu e-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <Button type="submit" variant="hero" className="w-full" disabled={submitting}>
            <Sparkles className="w-4 h-4" /> {submitting ? "Enviando..." : "Quero meu cupom!"}
          </Button>
        </form>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground text-center w-full mt-1 hover:underline">
          Não, obrigado
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default ScrollLeadCapture;
