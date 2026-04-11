import { useEffect, useState, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import PreloadLink from "@/components/PreloadLink";
import { Phone, Mail, Clock, ShoppingCart, Menu, X, Shield, MapPin, CloudSun, Search, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.png";

interface SearchSuggestion {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

const Header = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [weather, setWeather] = useState<{ city: string; region: string; temp_c: number | null; condition: string; icon: string } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsTimeout = useRef<ReturnType<typeof setTimeout>>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const { data } = await supabase
      .from("products")
      .select("id, name, slug, product_images(image_url, sort_order)")
      .eq("is_active", true)
      .ilike("name", `%${query}%`)
      .order("name")
      .limit(6);
    const mapped = (data ?? []).map((p: any) => ({
      id: p.id, name: p.name, slug: p.slug,
      image_url: p.product_images?.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.image_url,
    }));
    setSuggestions(mapped);
    setShowSuggestions(mapped.length > 0);
  }, []);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout(suggestionsTimeout.current);
    suggestionsTimeout.current = setTimeout(() => fetchSuggestions(val), 300);
  };
  const { items } = useCart();
  const { user, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("site_settings").select("*").then(({ data }) => {
      const map: Record<string, string> = {};
      data?.forEach(s => { map[s.key] = s.value || ""; });
      setSettings(map);
    });
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeatherLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data, error } = await supabase.functions.invoke("weather", {
            body: { lat: pos.coords.latitude, lon: pos.coords.longitude },
          });
          if (!error && data && !data.error) {
            setWeather(data);
          }
        } catch {
          // silently fail - weather is non-critical
        } finally {
          setWeatherLoading(false);
        }
      },
      () => setWeatherLoading(false),
      { timeout: 5000 }
    );
  }, []);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/loja", label: "Loja" },
    { to: "/loja#kits", label: "Kits" },
    { to: "/rastrear", label: "Rastrear Pedido" },
    { to: "/nossa-historia", label: "Nossa História" },
    { to: "/blog", label: "Blog" },
    { to: "/avaliacoes", label: "Avaliações" },
    { to: "/fale-conosco", label: "Contato" },
  ];

  const isActive = (path: string) => {
    const [pathname] = path.split("#");
    return location.pathname === pathname && !path.includes("#");
  };

  const categoriesNav = [
    { name: "Cartão de Visita", link: "/loja?search=cartao" },
    { name: "Banners", link: "/loja?search=banner" },
    { name: "Windbanner", link: "/loja?search=windbanner" },
    { name: "Blocos e Talões", link: "/loja?search=bloco" },
    { name: "Pastas", link: "/loja?search=pasta" },
    { name: "Brindes", link: "/loja?search=brinde" },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 bg-white shadow-sm transition-all duration-300 font-sans`}>
      {/* Top bar (Very thin) */}
      <div className={`hidden md:block border-b border-gray-100 bg-white transition-all duration-300 ${scrolled ? "h-0 overflow-hidden opacity-0" : "h-9 opacity-100"}`}>
        <div className="container mx-auto px-4 h-full flex justify-between items-center text-[11px] text-gray-500 font-medium tracking-wide">
          <div className="flex items-center gap-4">
            <span>Sua Marca em Alta Definição</span>
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-primary" /> {settings.phone || "(11) 99999-8888"}</span>
          </div>
          <div className="flex items-center gap-5">
            <Link to="/rastrear" className="hover:text-primary transition-colors">Meus Pedidos</Link>
            {isAdmin && (
              <Link to="/admin" className="text-primary font-bold hover:underline flex items-center gap-1">
                <Shield className="w-3 h-3" /> Painel Administrativo
              </Link>
            )}
            <Link to="/fale-conosco" className="hover:text-primary transition-colors">Central de Ajuda</Link>
            {weather && (
              <span className="flex items-center gap-1 text-gray-600 border-l border-gray-200 pl-4 ml-2">
                <MapPin className="w-3 h-3 text-primary" />
                {weather.city} • {weather.temp_c}°C
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Header (Logo, Search, Cart) */}
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 md:gap-8">
        {/* Logo */}
        <Link to="/" className="flex-shrink-0">
          <img src={logo} alt="Gráfica ImPlotter" className="h-10 md:h-12 object-contain" />
        </Link>
        
        {/* Search Bar - Center */}
        <div className="hidden md:flex flex-1 max-w-3xl relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                navigate(`/loja?search=${encodeURIComponent(searchQuery.trim())}`);
                setSearchQuery("");
                setSuggestions([]);
                setShowSuggestions(false);
              }
            }}
            className="w-full relative"
          >
            <input
              ref={searchInputRef}
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="O que você está procurando?"
              className="w-full pl-5 pr-12 py-3 rounded-full bg-white border-2 border-gray-100 text-gray-800 placeholder:text-gray-400 text-sm focus:outline-none focus:border-primary transition-colors shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
              autoComplete="off"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-primary transition-colors">
              <Search className="w-5 h-5" />
            </button>
            
            {/* Autocomplete */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                {suggestions.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      navigate(`/loja/${s.slug}`);
                      setSearchQuery("");
                      setSuggestions([]);
                      setShowSuggestions(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    {s.image_url && (
                      <img src={s.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 font-medium truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
          <Link to={user ? "/minha-conta" : "/login"} className="hidden lg:flex flex-col items-start justify-center group">
            <span className="text-[11px] text-gray-500 font-medium">Olá, bem-vindo(a)!</span>
            <span className="text-sm text-gray-800 font-bold group-hover:text-primary transition-colors">
              {user ? "Minha Conta" : "Entre ou cadastre-se"}
            </span>
          </Link>
          
          <Link to="/carrinho" className="relative p-2 text-gray-700 hover:text-primary transition-colors">
            <ShoppingCart className="w-7 h-7" />
            {items.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B00] text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm border-2 border-white">
                {items.length}
              </span>
            )}
          </Link>

          <button className="md:hidden p-2 text-gray-700" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Bottom Nav (Categories) */}
      <div className="hidden md:block bg-white border-t border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-6">
            <Link to="/loja" className="flex items-center gap-2 py-3.5 pr-6 font-bold text-gray-800 hover:text-primary transition-colors border-r border-gray-100">
              <Menu className="w-5 h-5" />
              Todos os Produtos
            </Link>
            <nav className="flex items-center gap-6 overflow-x-auto">
              {categoriesNav.map(cat => (
                <Link
                  key={cat.name}
                  to={cat.link}
                  className="py-3.5 text-sm font-semibold text-gray-600 hover:text-primary whitespace-nowrap transition-colors"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Search & Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100">
          <div className="p-4">
             <form onSubmit={(e) => { e.preventDefault(); if (searchQuery) navigate(`/loja?search=${searchQuery}`); }} className="relative mb-4">
               <input
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
                 placeholder="O que você está procurando?"
                 className="w-full pl-4 pr-10 py-3 rounded-xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:border-primary"
               />
               <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             </form>
             <nav className="flex flex-col gap-2">
               {categoriesNav.map(cat => (
                 <Link key={cat.name} to={cat.link} className="py-2.5 text-sm font-semibold text-gray-600 border-b border-gray-50">
                   {cat.name}
                 </Link>
               ))}
               <Link to={user ? "/minha-conta" : "/login"} className="py-2.5 text-sm font-bold text-primary mt-2">
                 {user ? "Minha Conta" : "Entre ou cadastre-se"}
               </Link>
             </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
