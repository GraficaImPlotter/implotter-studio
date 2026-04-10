import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, Instagram, Facebook, Shield, Award, Truck, CreditCard, Cookie } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCookieConsent } from "@/hooks/use-cookie-consent";
import logo from "@/assets/logo.png";

const Footer = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { openPreferences } = useCookieConsent();

  useEffect(() => {
    supabase.from("site_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ""; });
      setSettings(map);
    });
  }, []);

  const trustBadges = [
    { icon: Shield, label: "Compra Segura" },
    { icon: Award, label: "Qualidade Garantida" },
    { icon: Truck, label: "Entrega Rápida" },
    { icon: CreditCard, label: "PIX sem taxas" },
  ];

  return (
    <footer className="bg-[hsl(222_40%_12%)] text-[hsl(215_15%_75%)] border-t border-[hsl(217_30%_20%)]">
      {/* Trust badges bar */}
      <div className="border-b border-[hsl(217_30%_20%)]">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustBadges.map((badge, i) => (
              <div key={i} className="flex items-center gap-3 justify-center">
                <div className="w-10 h-10 rounded-xl bg-highlight/10 flex items-center justify-center">
                  <badge.icon className="w-5 h-5 text-highlight" />
                </div>
                <span className="text-sm font-semibold text-white">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <img src={logo} alt="Gráfica ImPlotter" className="h-10 mb-5" />
            <p className="text-[hsl(215_15%_70%)] text-sm leading-relaxed mb-5">
              Impressão profissional com qualidade, agilidade e atendimento especializado para destacar sua marca no mercado.
            </p>
            <div className="flex gap-2">
               {settings.instagram && (
                <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-highlight text-[hsl(215_15%_70%)] hover:text-white transition-all duration-300">
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {settings.facebook && (
                <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-highlight text-[hsl(215_15%_70%)] hover:text-white transition-all duration-300">
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {!settings.instagram && !settings.facebook && (
                <>
                  <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-highlight text-[hsl(215_15%_70%)] hover:text-white transition-all duration-300"><Instagram className="w-4 h-4" /></a>
                  <a href="#" className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-highlight text-[hsl(215_15%_70%)] hover:text-white transition-all duration-300"><Facebook className="w-4 h-4" /></a>
                </>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-display font-bold text-white mb-5">Links Rápidos</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/loja" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Loja</Link></li>
              <li><Link to="/nossa-historia" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Nossa História</Link></li>
              <li><Link to="/avaliacoes" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Avaliações</Link></li>
              <li><Link to="/afiliados" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Programa de Afiliados</Link></li>
              <li><Link to="/faq" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display font-bold text-white mb-5">Categorias</h3>
            <ul className="space-y-3 text-sm">
              <li><Link to="/loja?cat=cartoes-de-visita" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Cartões de Visita</Link></li>
              <li><Link to="/loja?cat=banners" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Banners</Link></li>
              <li><Link to="/loja?cat=adesivos" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Adesivos</Link></li>
              <li><Link to="/loja?cat=panfletos" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Panfletos</Link></li>
              <li><Link to="/loja?cat=personalizados" className="text-[hsl(215_15%_70%)] hover:text-highlight transition-colors">Personalizados</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-display font-bold text-white mb-5">Contato</h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-highlight/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-highlight" />
                </div>
                <span className="text-[hsl(215_15%_70%)]">{settings.phone || "(00) 0000-0000"}</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-highlight/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-highlight" />
                </div>
                <span className="text-[hsl(215_15%_70%)]">{settings.email || "contato@graficaimplotter.com.br"}</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-highlight/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 text-highlight" />
                </div>
                <span className="text-[hsl(215_15%_70%)]">{settings.address || "Rua Exemplo, 123"}{settings.city && ` - ${settings.city}`}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[hsl(217_30%_20%)] mt-14 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[hsl(215_15%_60%)]">
          <p>© {new Date().getFullYear()} {settings.company_name || "Gráfica ImPlotter"}. Todos os direitos reservados.</p>
          <div className="flex gap-6 items-center">
            <Link to="/politica-de-privacidade" className="hover:text-highlight transition-colors">Política de Privacidade</Link>
            <Link to="/termos-de-uso" className="hover:text-highlight transition-colors">Termos de Uso</Link>
            <button onClick={openPreferences} className="hover:text-highlight transition-colors flex items-center gap-1.5">
              <Cookie className="w-3 h-3" />
              Preferências de Cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
