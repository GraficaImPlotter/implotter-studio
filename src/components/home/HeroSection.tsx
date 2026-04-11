import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Star, Users, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { getOptimizedUrl } from "@/lib/image-utils";
import heroBanner from "@/assets/hero-banner.jpg";

interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_url: string;
  media_type: string;
  link_url: string | null;
  link_text: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

const HeroSection = () => {
  const [banner, setBanner] = useState<any>(null);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();


  useEffect(() => {
    supabase
      .from("banners")
      .select("*")
      .eq("is_active", true)
      .eq("location", "home")
      .order("sort_order")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setBanner(data);
      });

    supabase
      .from("hero_slides")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        if (data && data.length > 0) {
          const now = new Date().toISOString();
          const filtered = (data as HeroSlide[]).filter(s => {
            if (s.starts_at && s.starts_at > now) return false;
            if (s.ends_at && s.ends_at < now) return false;
            return true;
          });
          setSlides(filtered);
        }
      });

    supabase
      .from("site_settings")
      .select("key, value")
      .like("key", "hero_%")
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach(s => { map[s.key] = s.value || ""; });
          setSettings(map);
        }
      });
  }, []);

  // Auto-rotate slides
  useEffect(() => {
    if (slides.length <= 1) return;
    intervalRef.current = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [slides.length]);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
    clearInterval(intervalRef.current);
    if (slides.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % slides.length);
      }, 5000);
    }
  }, [slides.length]);

  const nextSlide = useCallback(() => goToSlide((currentSlide + 1) % slides.length), [currentSlide, slides.length, goToSlide]);
  const prevSlide = useCallback(() => goToSlide((currentSlide - 1 + slides.length) % slides.length), [currentSlide, slides.length, goToSlide]);

  const title = settings.hero_title || banner?.title || "Impressão profissional para destacar sua marca";
  const subtitle = settings.hero_subtitle || banner?.subtitle || "Cartões, banners, adesivos, panfletos e materiais gráficos com qualidade premium, agilidade e atendimento especializado.";
  const btnText = settings.hero_button_text || banner?.button_text || "Ver produtos";
  const btnLink = settings.hero_button_link || banner?.button_link || "/loja";
  const btn2Text = settings.hero_button2_text || "Solicitar orçamento";
  const btn2Link = settings.hero_button2_link || "/fale-conosco";
  const badgeText = settings.hero_badge_text || "Qualidade profissional garantida";

  // Determine what media to show in the printer
  const hasSlides = slides.length > 0;
  const currentMedia = hasSlides ? slides[currentSlide] : null;
  const fallbackImage = banner?.image_url || "/images/hero-lcp.jpg";

  const stats = [
    { icon: Users, value: settings.hero_stat_1_value || "1.250+", label: settings.hero_stat_1_label || "Clientes atendidos" },
    { icon: Package, value: settings.hero_stat_2_value || "3.000+", label: settings.hero_stat_2_label || "Pedidos entregues" },
    { icon: Star, value: settings.hero_stat_3_value || "4.9", label: settings.hero_stat_3_label || "Avaliação média" },
  ];

  return (
    <section className={`relative min-h-[80vh] lg:min-h-[90vh] flex items-center bg-mesh-gradient overflow-hidden`}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-highlight/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Content */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-8">
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary/20 shadow-glow-sm"
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  {badgeText}
                </motion.span>
              </div>

              <motion.h1 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className={`${settings.hero_title_font || "font-display"} ${settings.hero_title_size || "text-5xl md:text-6xl lg:text-8xl"} font-bold text-foreground leading-[1.05] mb-8 tracking-tight-dramatic`}
              >
                {title.includes("destacar") ? (
                  <>
                    {title.split("destacar")[0]}
                    <span className="text-gradient-primary">destacar</span>
                    {title.split("destacar")[1]}
                  </>
                ) : (
                  title
                )}
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-12 max-w-xl mx-auto lg:mx-0 opacity-80"
              >
                {subtitle}
              </motion.p>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-5 mb-16">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero" size="xl" asChild className="px-10 h-14 text-base font-bold rounded-2xl">
                    <Link to={btnLink}>
                      {btnText} <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero-outline" size="xl" asChild className="px-10 h-14 text-base font-bold rounded-2xl">
                    <Link to={btn2Link}>{btn2Text}</Link>
                  </Button>
                </motion.div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-10 opacity-60">
                {stats.map((stat, i) => (
                  <div key={i} className="flex flex-col items-center lg:items-start">
                    <span className="text-2xl font-black text-foreground font-display">{stat.value}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Floating 3D Showcase */}
          <div className="relative h-[500px] lg:h-[600px] perspective-2000 hidden lg:block">
            <div className="absolute inset-0 preserve-3d">
              {/* Product Card 1: Banner (Main) */}
              <motion.div
                initial={{ opacity: 0, z: -100, rotateY: 20 }}
                animate={{ 
                    opacity: 1, 
                    z: 0, 
                    rotateY: 0,
                    y: [0, -20, 0] 
                }}
                transition={{ 
                    duration: 1.2, 
                    delay: 0.8,
                    y: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute left-1/2 top-1/2 -ml-32 -mt-40 w-64 h-80 rounded-[2rem] glass-card-3d overflow-hidden z-20 group"
              >
                <img src="/images/hero-lcp.jpg" alt="Banners e Faixas" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Mídia Exterior</span>
                  <h3 className="text-white font-bold text-lg">Banners em Lona</h3>
                </div>
              </motion.div>

              {/* Product Card 2: Business Cards */}
              <motion.div
                initial={{ opacity: 0, z: -150, rotateY: -30 }}
                animate={{ 
                    opacity: 1, 
                    z: -50, 
                    rotateY: -10,
                    y: [0, 20, 0],
                    x: [0, -10, 0]
                }}
                transition={{ 
                    duration: 1.2, 
                    delay: 1,
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                    x: { duration: 7, repeat: Infinity, ease: "easeInOut" }
                }}
                className="absolute left-1/4 top-1/4 w-56 h-72 rounded-[2rem] glass-card-3d overflow-hidden z-10 group opacity-80 hover:opacity-100"
              >
                <img src="/images/hero-cards.jpg" alt="Cartões de Visita" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform">
                  <span className="text-[10px] font-black uppercase tracking-widest text-highlight mb-1">Papelaria Premium</span>
                  <h3 className="text-white font-bold text-lg">Cartões de Visita</h3>
                </div>
              </motion.div>

              {/* Product Card 3: Stickers */}
              <motion.div
                initial={{ opacity: 0, z: -200, rotateY: 30 }}
                animate={{ 
                    opacity: 1, 
                    z: -100, 
                    rotateY: 10,
                    y: [0, -15, 0],
                    x: [0, 15, 0]
                }}
                transition={{ 
                    duration: 1.2, 
                    delay: 1.2,
                    y: { duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 },
                    x: { duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
                }}
                className="absolute right-1/4 bottom-1/4 w-60 h-72 rounded-[2rem] glass-card-3d overflow-hidden z-0 group opacity-60 hover:opacity-100"
              >
                <img src="/images/hero-stickers.jpg" alt="Adesivos Vinil" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-6 flex flex-col justify-end translate-y-4 group-hover:translate-y-0 transition-transform">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Comunicação Visual</span>
                  <h3 className="text-white font-bold text-lg">Adesivos Vinil</h3>
                </div>
              </motion.div>
            </div>

            {/* Background Glows for the cards */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 rounded-full blur-[150px] animate-orbit pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Modern Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;

