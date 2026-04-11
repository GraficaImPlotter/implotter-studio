import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Star, Users, Package, ChevronLeft, ChevronRight } from "lucide-react";
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

  const categoriesList = [
    { name: "Adesivos e Etiquetas", icon: "/images/cat-adesivos.jpg", slug: "adesivos" },
    { name: "Blocos e Talões", icon: "/images/cat-blocos.jpg", slug: "blocos" },
    { name: "Brindes", icon: "/images/cat-brindes.jpg", slug: "brindes" },
    { name: "Cartão de Visita", icon: "/images/cat-cartoes.jpg", slug: "cartao" },
    { name: "Folhetos e Panfletos", icon: "/images/cat-panfletos.jpg", slug: "folhetos" },
    { name: "Pastas", icon: "/images/cat-pastas.jpg", slug: "pastas" },
    { name: "Wind Banner", icon: "/images/cat-wind.jpg", slug: "wind" },
  ];

  return (
    <div className="bg-[#F8FAFC] pb-12">
      {/* Premium Hero Section - Split Layout */}
      <section className="relative pt-[110px] md:pt-[165px] overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8 min-h-[500px] md:min-h-[600px] py-12">
            
            {/* Left Column: Headlines & CTAs */}
            <div className="w-full lg:w-[55%] flex flex-col items-start text-left z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <span className="bg-[#2563EB]/10 text-[#2563EB] text-[11px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-6 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
                Destaque sua Marca
              </span>
              
              <h1 className="text-4xl md:text-6xl xl:text-7xl font-black text-[#111827] leading-[1.05] tracking-tighter mb-6">
                Sua marca impressa com <span className="text-primary">qualidade profissional</span>
              </h1>
              
              <p className="text-lg md:text-xl text-gray-500 font-medium mb-10 max-w-xl leading-relaxed">
                Cartões, banners, adesivos, receituários e materiais personalizados para empresas e profissionais que buscam excelência.
              </p>

              <div className="flex flex-wrap gap-4 mb-12">
                <Link to="/loja">
                  <Button size="lg" className="h-14 px-8 bg-primary hover:bg-primary/90 text-white rounded-2xl text-base font-black shadow-xl shadow-primary/20 active:scale-95 transition-all">
                    Comprar Online
                  </Button>
                </Link>
                <Link to="/fale-conosco">
                  <Button size="lg" variant="outline" className="h-14 px-8 border-2 border-primary/20 hover:border-primary text-primary rounded-2xl text-base font-bold active:scale-95 transition-all">
                    Solicitar Orçamento
                  </Button>
                </Link>
                <a 
                  href={`https://wa.me/${settings.whatsapp?.replace(/\D/g, "")}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="h-14 px-8 flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-2xl text-base font-black shadow-xl shadow-green-500/20 active:scale-95 transition-all duration-300"
                >
                  Falar no WhatsApp
                </a>
              </div>

              {/* Quick Categories icons */}
              <div className="w-full pt-8 border-t border-gray-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-5">Categorias mais buscadas</p>
                <div className="flex flex-wrap gap-6">
                  {categoriesList.slice(0, 5).map((cat) => (
                    <Link 
                      key={cat.slug} 
                      to={`/loja?search=${cat.slug}`} 
                      className="flex items-center gap-3 group"
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center p-1.5 group-hover:scale-110 group-hover:shadow-md transition-all">
                        <img src={cat.icon} alt={cat.name} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-[11px] font-bold text-gray-600 group-hover:text-primary transition-colors">{cat.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Slider */}
            <div className="w-full lg:w-[45%] h-[400px] md:h-[500px] relative animate-in fade-in slide-in-from-right-12 duration-1000 delay-300">
              <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl relative border-gradient-premium group">
                {hasSlides ? (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      initial={{ opacity: 0, scale: 1.1 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute inset-0"
                    >
                      <img 
                        src={getOptimizedUrl(slides[currentSlide].media_url, 1200)} 
                        alt={slides[currentSlide].title || "Banner"} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      {(slides[currentSlide].title || slides[currentSlide].subtitle) && (
                        <div className="absolute bottom-10 left-10 right-10 text-white z-10 pointer-events-none">
                          {slides[currentSlide].title && <h3 className="text-2xl md:text-3xl font-black mb-2">{slides[currentSlide].title}</h3>}
                          {slides[currentSlide].subtitle && <p className="text-white/80 font-medium mb-4">{slides[currentSlide].subtitle}</p>}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                ) : (
                  <div className="absolute inset-0 bg-blue-600 flex items-center justify-center rounded-[2.5rem]">
                    <img src={banner?.image_url || "/images/hero-lcp.jpg"} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Slider Navigation Controls */}
                {slides.length > 1 && (
                  <>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                      {slides.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goToSlide(i)}
                          className={`h-1 rounded-full transition-all duration-300 ${
                            currentSlide === i ? "w-8 bg-white" : "w-1.5 bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              {/* Floating element for depth */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-primary/20 rounded-full blur-3xl -z-10 animate-pulse" />
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-secondary/20 rounded-full blur-3xl -z-10 animate-float" />
            </div>

          </div>
        </div>
      </section>

      {/* Circular Categories Section - Full Grid below Hero */}
      <section className="container mx-auto px-4 mt-12 py-12 bg-white rounded-[3rem] shadow-xl shadow-gray-200/50 border border-gray-100">
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
          <div className="text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-black text-[#111827] mb-2 tracking-tight">O que você deseja imprimir hoje?</h2>
            <p className="text-gray-400 font-medium">Explore nossas principais categorias em destaque</p>
          </div>
          <Link to="/loja">
            <Button variant="ghost" className="text-primary font-bold hover:bg-primary/5 rounded-xl gap-2 h-12">
              Ver todos os produtos <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        <div className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory gap-6 md:gap-10 lg:justify-between items-center sm:px-6">
            {categoriesList.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="flex flex-col flex-shrink-0 items-center snap-center group cursor-pointer w-28 md:w-36"
              >
                <Link to={`/loja?search=${cat.slug}`} className="flex flex-col items-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-4 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:-translate-y-3 transition-all duration-500 ease-spring">
                    <img 
                      src={cat.icon} 
                      alt={cat.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <span className="text-[#111827] font-black text-xs md:text-sm text-center mt-6 group-hover:text-primary transition-colors tracking-tight">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            ))}
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
