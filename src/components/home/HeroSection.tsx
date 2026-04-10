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
  const fallbackImage = banner?.image_url || heroBanner;

  const stats = [
    { icon: Users, value: settings.hero_stat_1_value || "1.250+", label: settings.hero_stat_1_label || "Clientes atendidos" },
    { icon: Package, value: settings.hero_stat_2_value || "3.000+", label: settings.hero_stat_2_label || "Pedidos entregues" },
    { icon: Star, value: settings.hero_stat_3_value || "4.9", label: settings.hero_stat_3_label || "Avaliação média" },
  ];

  return (
    <section className={`relative min-h-[70vh] lg:min-h-[85vh] flex items-center ${settings.hero_bg_gradient || "bg-gradient-hero"} overflow-hidden`}>
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/98 to-background/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/60" />
      </div>

      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-highlight/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-highlight-glow/5 rounded-full blur-3xl animate-float" style={{ animationDelay: "3s" }} />

      <div className="container mx-auto px-4 relative z-10 pt-16 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="flex items-center gap-3 mb-8">
                <motion.span 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className={`inline-flex items-center gap-2 ${settings.hero_badge_bg || "bg-primary/10"} ${settings.hero_badge_color || "text-primary"} px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-primary/20 shadow-glow-sm`}
                >
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--primary)]" />
                  {badgeText}
                </motion.span>
              </div>

              <motion.h1 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className={`${settings.hero_title_font || "font-display"} ${settings.hero_title_size || "text-4xl sm:text-5xl md:text-6xl lg:text-7xl"} font-bold ${settings.hero_title_color || "text-foreground"} leading-dramatic mb-6 tracking-tight-dramatic`}
              >
                {title.includes("destacar") ? (
                  <>
                    {title.split("destacar")[0]}
                    <span className={settings.hero_accent_color || "text-gradient-accent"}>destacar</span>
                    {title.split("destacar")[1]}
                  </>
                ) : (
                  title
                )}
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className={`${settings.hero_subtitle_size || "text-lg md:text-xl"} ${settings.hero_subtitle_color || "text-muted-foreground"} ${settings.hero_body_font || "font-sans"} leading-relaxed mb-10 max-w-xl`}
              >
                {subtitle}
              </motion.p>

              <div className="flex flex-wrap gap-4 mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <Button variant="hero" size="xl" asChild>
                    <Link to={btnLink}>
                      {btnText} <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                >
                  <Button variant="hero-outline" size="xl" asChild>
                    <Link to={btn2Link}>{btn2Text}</Link>
                  </Button>
                </motion.div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-wrap gap-8 md:gap-12"
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center carbon-fiber-bg border border-white/5 shadow-lg group-hover:shadow-glow-sm transition-all duration-300">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-black text-2xl text-foreground tracking-tight">{stat.value}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Printer animation with carousel */}
          <div className="hidden lg:flex justify-center items-center">
            <div className="relative w-full max-w-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="relative"
              >
                {/* Printer top slot */}
                <div className="relative z-20 bg-secondary/80 backdrop-blur-sm rounded-t-2xl h-8 mx-4 border border-border/50 border-b-0 flex items-center justify-center">
                  <div className="w-20 h-1 rounded-full bg-highlight/30" />
                </div>

                {/* Printer body */}
                <div className="relative z-20 glass-card-premium rounded-3xl border-gradient-premium p-4 mx-0 shadow-glow-sm">
                  {/* Status lights */}
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-success animate-pulse shadow-[0_0_8px_var(--success)]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
                    <span className="text-[9px] font-black tracking-widest text-primary ml-auto font-mono uppercase">
                      {hasSlides && slides.length > 1 ? `SLIDE ${currentSlide + 1}/${slides.length}` : "PROCESSING..."}
                    </span>
                  </div>

                  {/* Print slot with carousel */}
                  <div className="relative overflow-hidden rounded-xl bg-background/50 aspect-[4/3]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentMedia?.id || "fallback"}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0"
                      >
                        {currentMedia?.link_url ? (
                          <Link to={currentMedia.link_url} className="block w-full h-full cursor-pointer">
                            {currentMedia.media_type === "video" ? (
                              <video src={currentMedia.media_url} className="w-full h-full object-cover rounded-xl" autoPlay loop muted playsInline />
                            ) : (
                            <img 
                              src={getOptimizedUrl(currentMedia.media_url, { width: 800 })} 
                              alt={currentMedia.title || "Material impresso"} 
                              className="w-full h-full object-cover rounded-xl" 
                              loading="eager"
                              fetchPriority={currentSlide === 0 ? "high" : "auto"}
                              width={800}
                              height={600}
                            />
                          </Link>
                        ) : currentMedia?.media_type === "video" ? (
                          <video src={currentMedia.media_url} className="w-full h-full object-cover rounded-xl" autoPlay loop muted playsInline />
                        ) : (
                          <img 
                            src={getOptimizedUrl(currentMedia?.media_url || fallbackImage, { width: 800 })} 
                            alt={currentMedia?.title || "Material impresso"} 
                            className="w-full h-full object-cover rounded-xl" 
                            loading="eager"
                            fetchPriority={currentSlide === 0 ? "high" : "auto"}
                            width={800}
                            height={600}
                          />
                        )}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-background/60 to-transparent" />
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Scan line */}
                    <div className="absolute left-0 right-0 top-0 h-px bg-highlight/60 shadow-[0_0_8px_hsl(217_85%_55%/0.5)] z-10" />

                    {/* Slide overlay info */}
                    {currentMedia?.title && (
                      <div className="absolute bottom-0 left-0 right-0 z-20 p-3 bg-gradient-to-t from-black/70 to-transparent">
                        <p className="text-white text-sm font-semibold truncate">{currentMedia.title}</p>
                        {currentMedia.subtitle && (
                          <p className="text-white/70 text-xs truncate">{currentMedia.subtitle}</p>
                        )}
                      </div>
                    )}

                    {/* Carousel nav arrows */}
                    {hasSlides && slides.length > 1 && (
                      <>
                        <button
                          onClick={prevSlide}
                          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={nextSlide}
                          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white hover:bg-black/60 transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Dots indicator */}
                  {hasSlides && slides.length > 1 && (
                    <div className="flex justify-center gap-1.5 mt-2">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToSlide(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${
                            i === currentSlide ? "bg-highlight w-4" : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Printer output tray */}
                <div className="relative z-10 bg-secondary/40 backdrop-blur-sm rounded-b-2xl h-5 mx-6 border border-border/30 border-t-0" />

                {/* Glow */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-highlight/10 rounded-full blur-2xl" />
              </motion.div>

              {/* Link CTA on current slide */}
              {currentMedia?.link_url && currentMedia?.link_text && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mt-4"
                >
                  <Link
                    to={currentMedia.link_url}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-highlight hover:text-highlight/80 transition-colors"
                  >
                    {currentMedia.link_text} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default HeroSection;

