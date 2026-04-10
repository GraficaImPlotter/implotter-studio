import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const WhatsAppButton = () => {
  const [whatsapp, setWhatsapp] = useState("5500000000000");

  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "whatsapp").maybeSingle().then(({ data }) => {
      if (data?.value) setWhatsapp(data.value);
    });
  }, []);

  return (
    <a
      href={`https://wa.me/${whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-success rounded-full flex items-center justify-center shadow-elevated hover:scale-110 transition-transform animate-pulse-glow"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-7 h-7 text-success-foreground" />
    </a>
  );
};

export default WhatsAppButton;
