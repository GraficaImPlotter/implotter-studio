import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Shield, BarChart3, Megaphone, Settings2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useCookieConsent, type CookiePreferences } from "@/hooks/use-cookie-consent";

const categories = [
  {
    key: "necessary" as const,
    label: "Cookies Necessários",
    description: "Essenciais para o funcionamento básico do site. Não podem ser desativados.",
    icon: Shield,
    locked: true,
  },
  {
    key: "analytics" as const,
    label: "Cookies Analíticos",
    description: "Permitem analisar o tráfego do site e entender como os visitantes interagem com as páginas.",
    icon: BarChart3,
    locked: false,
  },
  {
    key: "marketing" as const,
    label: "Cookies de Marketing",
    description: "Usados para exibir anúncios relevantes, remarketing e rastreamento de conversões.",
    icon: Megaphone,
    locked: false,
  },
  {
    key: "functional" as const,
    label: "Cookies Funcionais",
    description: "Melhoram a experiência salvando preferências como idioma e região.",
    icon: Settings2,
    locked: false,
  },
];

export default function CookieBanner() {
  const { showBanner, showPreferences, acceptAll, rejectOptional, savePreferences, closePreferences, openPreferences } = useCookieConsent();
  const [prefs, setPrefs] = useState<CookiePreferences>({ necessary: true, analytics: false, marketing: false, functional: false });

  const handleToggle = (key: keyof CookiePreferences) => {
    if (key === "necessary") return;
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <>
      {/* Banner */}
      <AnimatePresence>
        {showBanner && !showPreferences && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-[60] p-4 md:p-6"
          >
            <div className="container mx-auto max-w-4xl">
              <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="hidden sm:flex w-10 h-10 rounded-xl bg-primary/10 items-center justify-center flex-shrink-0 mt-0.5">
                    <Cookie className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-bold text-foreground text-base mb-1.5">
                      Sua privacidade importa 🍪
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      Utilizamos cookies para melhorar sua experiência, analisar o tráfego do site e personalizar conteúdos. Você pode aceitar todos, recusar os opcionais ou configurar suas preferências.{" "}
                      <Link to="/politica-de-privacidade" className="text-primary hover:underline font-medium">
                        Política de Privacidade
                      </Link>
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={acceptAll} className="gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        Aceitar todos
                      </Button>
                      <Button size="sm" variant="outline" onClick={rejectOptional}>
                        Recusar opcionais
                      </Button>
                      <Button size="sm" variant="ghost" onClick={openPreferences} className="gap-1.5">
                        <Settings2 className="w-3.5 h-3.5" />
                        Configurar cookies
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preferences Modal */}
      <AnimatePresence>
        {showPreferences && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) closePreferences(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Cookie className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <h2 className="font-display font-bold text-foreground text-lg">Preferências de Cookies</h2>
                </div>
                <button onClick={closePreferences} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <p className="text-sm text-muted-foreground mb-4">
                  Escolha quais categorias de cookies deseja permitir. Cookies necessários são sempre ativos para garantir o funcionamento do site.
                </p>
                {categories.map((cat) => (
                  <div key={cat.key} className="rounded-xl border border-border p-4 hover:border-primary/20 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <cat.icon className="w-4 h-4 text-primary" />
                        <span className="font-semibold text-sm text-foreground">{cat.label}</span>
                      </div>
                      {cat.locked ? (
                        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
                          Sempre ativo
                        </span>
                      ) : (
                        <Switch
                          checked={prefs[cat.key]}
                          onCheckedChange={() => handleToggle(cat.key)}
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-6.5">
                      {cat.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border flex flex-wrap gap-2">
                <Button size="sm" onClick={() => savePreferences(prefs)} className="flex-1">
                  Salvar preferências
                </Button>
                <Button size="sm" variant="outline" onClick={acceptAll} className="flex-1">
                  Aceitar todos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
