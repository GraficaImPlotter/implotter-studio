import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Star, Users, Package } from "lucide-react";
import { getOptimizedUrl } from "@/lib/image-utils";
import logo from "@/assets/logo.png";

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
    <section className="relative min-h-[85vh] lg:min-h-[100vh] flex items-center bg-blueprint-grid overflow-hidden">
      {/* Background Overlays */}
      <div className="absolute inset-0 bg-blueprint-dot opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-br from-[hsl(222_40%_10%)] via-transparent to-[hsl(222_40%_10%)] opacity-80" />
      
      {/* Dynamic Guidelines */}
      <div className="absolute top-1/4 left-0 right-0 h-px bg-highlight/10" />
      <div className="absolute top-2/3 left-0 right-0 h-px bg-highlight/10" />
      <div className="absolute left-1/4 top-0 bottom-0 w-px bg-highlight/10" />
      <div className="absolute left-3/4 top-0 bottom-0 w-px bg-highlight/10" />

      <div className="container mx-auto px-4 relative z-10 pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Side: Content with Plate for Readability */}
          <div className="lg:col-span-6">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="glass-content-plate relative overflow-hidden"
            >
              {/* Corner accent */}
              <div className="absolute top-0 right-0 w-12 h-12 border-t-2 border-r-2 border-primary/30 rounded-tr-[2.5rem]" />
              
              <div className="flex items-center gap-3 mb-8">
                <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest border border-primary/20">
                  <span className="w-1.5 h-1.5 rounded-sm bg-primary animate-pulse" />
                  {badgeText}
                </span>
              </div>

              <h1 className={`${settings.hero_title_font || "font-display"} ${settings.hero_title_size || "text-5xl md:text-6xl lg:text-7xl"} font-black text-white leading-[1.1] mb-8 tracking-tight text-glow-dramatic`}>
                {title.includes("destacar") ? (
                  <>
                    {title.split("destacar")[0]}
                    <span className="text-highlight">destacar</span>
                    {title.split("destacar")[1]}
                  </>
                ) : (
                  title
                )}
              </h1>

              <p className="text-lg md:text-xl text-[hsl(215_15%_80%)] leading-relaxed mb-10 max-w-lg font-medium">
                {subtitle}
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero" size="xl" asChild className="px-10 h-14 text-base font-bold shadow-glow-sm">
                    <Link to={btnLink}>
                      {btnText} <ArrowRight className="w-5 h-5 ml-2" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="hero-outline" size="xl" asChild className="px-10 h-14 text-base font-bold border-white/10 hover:bg-white/5">
                    <Link to={btn2Link}>{btn2Text}</Link>
                  </Button>
                </motion.div>
              </div>

              {/* Stats Footer on Plate */}
              <div className="flex flex-wrap gap-10 pt-10 border-t border-white/5">
                {stats.map((stat, i) => (
                  <div key={i} className="flex flex-col">
                    <span className="text-2xl font-black text-white font-display mb-1">{stat.value}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[hsl(215_15%_60%)]">{stat.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right Side: Logo Drafting / Construction UI */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative w-full max-w-[500px] aspect-square flex items-center justify-center"
            >
              {/* Drafting Circle 1 */}
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border border-highlight/10 rounded-full"
              />
              {/* Construction Lines Overlay */}
              <div className="absolute inset-0 preserve-3d">
                {/* Simulated SVG Path Drawing Component */}
                <svg viewBox="0 0 400 400" className="w-full h-full stroke-highlight/30 fill-none">
                  {/* Drawing Path Outline */}
                  <motion.path
                    d="M 100,200 L 300,200 M 200,100 L 200,300"
                    strokeWidth="1"
                    strokeDasharray="400"
                    initial={{ strokeDashoffset: 400 }}
                    animate={{ strokeDashoffset: [400, 0, 0, 400] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                  />
                  {/* Outer circle drafting */}
                  <motion.circle
                    cx="200" cy="200" r="160"
                    strokeWidth="0.5"
                    strokeDasharray="1000"
                    initial={{ strokeDashoffset: 1000 }}
                    animate={{ strokeDashoffset: 0 }}
                    transition={{ duration: 2, delay: 1 }}
                  />
                </svg>
              </div>

              {/* Central Logo Container */}
              <div className="relative z-20 p-12 lg:p-16">
                <motion.div
                  animate={{ 
                    y: [0, -10, 0],
                  }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="relative"
                >
                  <img src={logo} alt="Logo ImPlotter" className="w-full max-w-[280px] drop-shadow-[0_0_30px_hsl(217_85%_55%/0.4)] brightness-110" />
                  
                  {/* Construction Nodes around Logo */}
                  <div className="absolute top-0 left-0 node-point -translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute top-0 right-0 node-point translate-x-1/2 -translate-y-1/2" />
                  <div className="absolute bottom-0 left-0 node-point -translate-x-1/2 translate-y-1/2" />
                  <div className="absolute bottom-0 right-0 node-point translate-x-1/2 translate-y-1/2" />
                  
                  {/* Moving Connector Lines */}
                  <motion.div 
                    animate={{ x: ["0%", "100%", "0%"] }}
                    transition={{ duration: 6, repeat: Infinity }}
                    className="absolute top-0 left-0 w-1/2 h-px bg-highlight/40" 
                  />
                </motion.div>
              </div>

              {/* HUD / CAD Style elements */}
              <div className="absolute top-5 left-5 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <div className="w-2 h-2 rounded-full bg-highlight" />
                <div className="w-2 h-2 rounded-full bg-white/20" />
              </div>
              <div className="absolute bottom-5 right-5 text-[9px] font-mono text-highlight/40 tracking-widest uppercase">
                X: 42.069 Y: 13.37
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Elegant Bottom Transition */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[hsl(222_40%_8%)] to-transparent" />
    </section>
  );
};

export default HeroSection;

