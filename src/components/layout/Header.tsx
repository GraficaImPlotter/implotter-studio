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

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[hsl(222_40%_12%/0.97)] backdrop-blur-xl border-b border-[hsl(217_30%_20%)] shadow-lg" : "bg-[hsl(222_40%_12%)]"}`}>
      {/* Top bar */}
      <div className={`hidden md:block transition-all duration-300 ${scrolled ? "h-0 overflow-hidden opacity-0" : "h-auto opacity-100"}`}>
        <div className="container mx-auto px-4 py-2 flex justify-between items-center text-xs text-[hsl(215_15%_70%)]">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-highlight" /> {settings.phone || "(11) 99999-8888"}</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-highlight" /> {settings.email || "contato@graficaimplotter.com.br"}</span>
          </div>
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-highlight" /> {settings.business_hours || "Seg-Sex: 8h às 18h"}</span>
            {weather ? (
              <span className="flex items-center gap-2 text-highlight font-semibold">
                {weather.icon && <img src={`https:${weather.icon}`} alt={weather.condition} className="w-5 h-5" />}
                <span>{weather.temp_c !== null ? `${weather.temp_c}°C` : ""}</span>
                <span className="text-[hsl(215_15%_70%)] font-normal flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-highlight" />
                  {weather.city}{weather.region ? `, ${weather.region}` : ""}
                </span>
              </span>
            ) : weatherLoading ? (
              <span className="flex items-center gap-1.5 text-[hsl(215_15%_70%)] animate-pulse">
                <CloudSun className="w-3 h-3 text-highlight" /> Carregando clima...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-highlight" /> Ative a localização
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <img src={logo} alt="Gráfica ImPlotter" className="h-12 transition-transform group-hover:scale-105 drop-shadow-[0_0_12px_hsl(217_85%_55%/0.4)] brightness-110" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map(l => (
            <PreloadLink
              key={l.to}
              to={l.to}
              onClick={(e: React.MouseEvent) => {
                if (l.to.includes("#") && location.pathname === l.to.split("#")[0]) {
                  e.preventDefault();
                  const hash = l.to.split("#")[1];
                  const el = document.getElementById(hash);
                  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive(l.to)
                  ? "text-white bg-white/10"
                  : "text-[hsl(215_15%_75%)] hover:text-white hover:bg-white/8"
              }`}
            >
              {l.label}
            </PreloadLink>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme toggle */}
          <button
            className="p-2.5 rounded-lg text-[hsl(215_15%_75%)] hover:text-white hover:bg-white/10 transition-all"
            onClick={toggleTheme}
            title={theme === "light" ? "Modo escuro" : "Modo claro"}
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          {/* Search toggle */}
          <button
            className="p-2.5 rounded-lg text-[hsl(215_15%_75%)] hover:text-white hover:bg-white/10 transition-all"
            onClick={() => { setSearchOpen(v => !v); setTimeout(() => searchInputRef.current?.focus(), 100); }}
          >
            <Search className="w-5 h-5" />
          </button>
          {isAdmin && (
            <Link to="/admin" className="hidden md:flex items-center gap-1.5 text-highlight hover:text-highlight/80 transition-colors text-sm font-semibold bg-white/10 px-3 py-2 rounded-lg">
              <Shield className="w-4 h-4" /> Admin
            </Link>
          )}
          <Link to="/carrinho" className="relative p-2.5 rounded-lg text-[hsl(215_15%_75%)] hover:text-white hover:bg-white/10 transition-all">
            <ShoppingCart className="w-5 h-5" />
            {items.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-gradient-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-bold shadow-lg">
                {items.length}
              </span>
            )}
          </Link>
          <Link
            to={user ? "/minha-conta" : "/login"}
            className="hidden sm:flex text-[hsl(215_15%_75%)] hover:text-white px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-white/10 items-center gap-1.5"
          >
            {user ? "Minha Conta" : "Entrar"}
          </Link>
          <button className="lg:hidden p-2 text-white" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="bg-[hsl(222_40%_10%)] border-t border-[hsl(217_30%_20%)]">
          <div className="container mx-auto px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (searchQuery.trim()) {
                  navigate(`/loja?search=${encodeURIComponent(searchQuery.trim())}`);
                  setSearchOpen(false);
                  setSearchQuery("");
                  setSuggestions([]);
                  setShowSuggestions(false);
                }
              }}
              className="flex gap-2 max-w-xl mx-auto relative"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215_15%_50%)]" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Buscar produtos..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg bg-[hsl(222_40%_15%)] border border-[hsl(217_30%_25%)] text-white placeholder:text-[hsl(215_15%_50%)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(""); setSuggestions([]); setShowSuggestions(false); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {/* Autocomplete dropdown */}
                {showSuggestions && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden">
                    {suggestions.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          navigate(`/loja/${s.slug}`);
                          setSearchOpen(false);
                          setSearchQuery("");
                          setSuggestions([]);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted transition-colors"
                      >
                        {s.image_url && (
                          <img src={s.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                        )}
                        <span className="text-sm text-foreground truncate">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button type="submit" className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
                Buscar
              </button>
              <button type="button" onClick={() => { setSearchOpen(false); setShowSuggestions(false); }} className="p-2.5 text-[hsl(215_15%_70%)] hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-background/95 backdrop-blur-xl border-t border-border">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive(l.to) ? "text-highlight bg-highlight/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="border-t border-border mt-2 pt-2">
              <Link to={user ? "/minha-conta" : "/login"} onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center gap-2">
                {user ? "Minha Conta" : "Entrar"}
              </Link>
              {isAdmin && (
                <Link to="/admin" onClick={() => setMobileOpen(false)} className="px-4 py-3 rounded-lg text-sm font-medium text-highlight bg-highlight/10 flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Painel Admin
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
