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
    <div className="bg-white">
      {/* Full Width Banner Carousel */}
      <section className="relative w-full h-[300px] sm:h-[400px] md:h-[500px] bg-blue-600 overflow-hidden mt-[110px] md:mt-[165px]">
        {hasSlides ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0"
            >
              <img 
                src={getOptimizedUrl(slides[currentSlide].media_url, 1920)} 
                alt={slides[currentSlide].title || "Banner"} 
                className="w-full h-full object-cover object-center"
              />
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="absolute inset-0 bg-blue-600 flex items-center justify-center">
             {/* Fallback Static Banner Content (FuturaIM style) */}
             <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
                <div className="text-white text-left z-10 max-w-lg">
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded mb-4 inline-block">LANÇAMENTO</span>
                  <h1 className="text-4xl md:text-5xl font-black mb-2 leading-tight">Sua Marca em<br/>Alta Definição</h1>
                  <p className="text-xl md:text-2xl mb-4 font-medium">A partir de<br/><span className="text-3xl md:text-4xl font-black">R$29,99</span> un.</p>
                  <Button className="bg-[#FF6B00] hover:bg-[#e65c00] text-white rounded-full px-8 text-base font-bold shadow-lg h-12">
                     PERSONALIZAR +
                  </Button>
                </div>
                <div className="hidden md:block w-1/2 h-full absolute right-0 top-0 pointer-events-none">
                  {banner?.image_url && <img src={banner.image_url} alt="" className="w-full h-full object-cover object-left" />}
                </div>
             </div>
          </div>
        )}

        {/* Carousel Controls */}
        {slides.length > 1 && (
          <>
            <button onClick={prevSlide} className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-all z-20">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button onClick={nextSlide} className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-white/20 hover:bg-white/40 rounded-full text-white backdrop-blur-sm transition-all z-20">
              <ChevronRight className="w-6 h-6" />
            </button>
            
            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className={`w-10 h-1 rounded-full transition-all ${
                    currentSlide === i ? "bg-white" : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Circular Categories Row */}
      <section className="bg-gray-50 py-8 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto pb-4 hide-scrollbar snap-x snap-mandatory gap-6 md:gap-8 justify-start xl:justify-center items-center">
            {categoriesList.map((cat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col flex-shrink-0 items-center gap-3 w-28 md:w-36 snap-center group cursor-pointer"
              >
                <Link to={`/loja?search=${cat.slug}`} className="flex flex-col items-center">
                  <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden flex items-center justify-center p-2 group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] group-hover:-translate-y-2 transition-all duration-300">
                    <img 
                      src={cat.icon} 
                      alt={cat.name} 
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <span className="text-gray-800 font-semibold text-xs md:text-sm text-center mt-4 group-hover:text-primary transition-colors line-clamp-2">
                    {cat.name}
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HeroSection;
