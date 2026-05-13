import { useState, useEffect, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  Search,
  MapPin,
  Play,
  RotateCw,
  Eye,
  Send,
  Database,
  ArrowRight,
  TrendingUp,
  Award,
  Users,
  CheckCircle,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Terminal,
  Instagram,
  Mail,
  Globe,
  Star,
  ChevronRight,
  Phone,
  Layout,
  Palette,
  FileImage,
  Layers,
  Check,
  AlertTriangle,
  Clock,
  Flame,
  Shield,
  Zap,
  Snowflake,
  Trash2,
  X,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Prospect {
  name: string;
  category: string;
  address: string;
  website: string;
  phone: string;
  whatsapp: string;
  rating: number;
  reviews_count: number;
  opening_hours?: string;
  instagram?: string;
  email?: string;
  status?: string;
  analysis?: any;
  customColors?: { primary: string; secondary: string };
}

const NY_PRESETS = [
  { label: "Clínicas Médicas", value: "clínica médica" },
  { label: "Dentistas", value: "dentista" },
  { label: "Advogados", value: "escritório de advocacia" },
  { label: "Academias / Estúdios", value: "academia" },
  { label: "Restaurantes / Bares", value: "restaurante" },
  { label: "Salões de Estética", value: "salão de beleza" },
];

const getApiUrl = () => {
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    return "http://localhost:3001";
  }
  return import.meta.env.VITE_API_URL || window.location.origin;
};

const AdminProspects = () => {
  const { toast } = useToast();
  
  // Scraper Form states
  const [keyword, setKeyword] = useState("clínica médica");
  const [city, setCity] = useState("São Paulo");
  const [limit, setLimit] = useState(5);
  const [simulate, setSimulate] = useState(true);
  
  // Execution states
  const [isScraping, setIsScraping] = useState(false);
  const [scrapingLogs, setScrapingLogs] = useState<string[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  
  // Setup Audit Modal States (Part 2 Inputs)
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditLead, setAuditLead] = useState<Prospect | null>(null);
  const [auditIndex, setAuditIndex] = useState<number>(-1);
  const [auditReviews, setAuditReviews] = useState("");
  const [auditPhotos, setAuditPhotos] = useState<Array<{ base64: string; mimeType: string; previewUrl: string }>>([]);
  
  // Analysis Drawer States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisPanelOpen, setAnalysisPanelOpen] = useState(false);
  const [pitchText, setPitchText] = useState("");
  const [activeMockupType, setActiveMockupType] = useState<"card" | "banner">("card");
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  // WhatsApp config states (stored in localStorage)
  const [waApiUrl, setWaApiUrl] = useState(() => localStorage.getItem("implotter_wa_url") || "");
  const [waApiKey, setWaApiKey] = useState(() => localStorage.getItem("implotter_wa_key") || "");
  const [waInstance, setWaInstance] = useState(() => localStorage.getItem("implotter_wa_instance") || "implotter");
  const [isSendingWa, setIsSendingWa] = useState(false);
  
  // Statistics
  const [stats, setStats] = useState({
    totalScraped: 0,
    analyzed: 0,
    whatsappSent: 0,
    syncedCrm: 0
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [scrapingLogs]);

  // Load stats and prospects from local storage
  useEffect(() => {
    const savedStats = localStorage.getItem("implotter_prospecting_stats");
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch (_) {}
    }
    
    const savedProspects = localStorage.getItem("implotter_prospects");
    if (savedProspects) {
      try {
        setProspects(JSON.parse(savedProspects));
      } catch (_) {}
    }
  }, []);

  const saveStats = (newStats: typeof stats) => {
    setStats(newStats);
    localStorage.setItem("implotter_prospecting_stats", JSON.stringify(newStats));
  };

  const saveProspects = (newProspects: Prospect[]) => {
    setProspects(newProspects);
    localStorage.setItem("implotter_prospects", JSON.stringify(newProspects));
  };

  // Run Google Maps Scraper (SSE Streamed)
  const startScraping = async () => {
    if (isScraping) return;
    
    setIsScraping(true);
    setScrapingLogs(["[SISTEMA] Iniciando módulo de prospecção..."]);
    setSelectedProspect(null);
    setAnalysisPanelOpen(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const API_URL = getApiUrl();
      const sseUrl = `${API_URL}/api/prospects/stream-scrape?keyword=${encodeURIComponent(keyword)}&city=${encodeURIComponent(city)}&limit=${limit}&simulate=${simulate}`;
      
      const response = await fetch(sseUrl, {
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro de conexão (${response.status})`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
      if (!reader) {
        throw new Error("Não foi possível inicializar o leitor de stream.");
      }

      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);
              
              if (data.type === "progress") {
                setScrapingLogs(prev => [...prev, `[PLAYWRIGHT] ${data.message}`]);
              } else if (data.type === "complete") {
                const scrapedLeads = data.leads.map((l: any) => ({ ...l, status: "Novo" }));
                setScrapingLogs(prev => [...prev, `[SUCESSO] Varredura concluída. ${scrapedLeads.length} leads adicionados.`]);
                saveProspects(scrapedLeads);
                
                const newTotal = stats.totalScraped + scrapedLeads.length;
                saveStats({ ...stats, totalScraped: newTotal });
                
                toast({
                  title: "Pesquisa Concluída!",
                  description: `Foram capturados ${scrapedLeads.length} novos leads com sucesso!`,
                });
              } else if (data.type === "error") {
                setScrapingLogs(prev => [...prev, `[ERRO] Falha crítica: ${data.message}`]);
                toast({
                  title: "Falha na Captura",
                  description: data.message,
                  variant: "destructive"
                });
              }
            } catch (e) {
              console.error("Erro parsing SSE line:", line, e);
            }
          }
        }
      }
      
    } catch (err: any) {
      console.error(err);
      setScrapingLogs(prev => [...prev, `[SISTEMA_ERRO] Falha na requisição: ${err.message}`]);
      toast({
        title: "Erro de Comunicação",
        description: err.message || "Erro desconhecido ao tentar prospectar.",
        variant: "destructive"
      });
    } finally {
      setIsScraping(false);
    }
  };

  // Open audit modal configuration
  const openAuditConfig = (lead: Prospect, index: number) => {
    setAuditLead(lead);
    setAuditIndex(index);
    setAuditReviews(`Cliente possui nota ${lead.rating}★ baseada em ${lead.reviews_count} comentários no Google Maps. Localizado em ${lead.address}.`);
    setAuditPhotos([]);
    setAuditModalOpen(true);
  };

  // Handles branding photo upload and base64 translation
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setAuditPhotos(prev => [
          ...prev,
          {
            base64: reader.result as string,
            mimeType: file.type,
            previewUrl: URL.createObjectURL(file)
          }
        ]);
      };
      
      reader.readAsDataURL(file);
    }
  };

  const removeAuditPhoto = (idx: number) => {
    setAuditPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  // Run detailed AI brand audit with computer vision capabilities
  const executeBrandAudit = async () => {
    if (!auditLead || auditIndex === -1 || isAnalyzing) return;
    
    setIsAnalyzing(true);
    setAuditModalOpen(false);
    setSelectedProspect(auditLead);
    
    toast({
      title: "Auditoria Visual Iniciada",
      description: `Iniciando diagnóstico completo e análise de marca de ${auditLead.name}...`,
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const API_URL = getApiUrl();
      
      // Map simplified photo object without preview URLs to send to backend
      const photoPayload = auditPhotos.map(p => ({
        base64: p.base64,
        mimeType: p.mimeType
      }));

      const response = await fetch(`${API_URL}/api/prospects/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          lead: auditLead,
          photos: photoPayload,
          customReviews: auditReviews
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Erro ao rodar análise do Gemini");
      }

      // Save audit analysis inside prospect details
      const updatedProspects = [...prospects];
      updatedProspects[auditIndex] = {
        ...auditLead,
        status: "Analisado",
        analysis: data.analysis,
        customColors: data.analysis.brandColors || { primary: "#1e3a8a", secondary: "#3b82f6" }
      };
      
      saveProspects(updatedProspects);
      setSelectedProspect(updatedProspects[auditIndex]);
      setPitchText(data.analysis.personalizedPitch);
      setAnalysisPanelOpen(true);

      const newAnalyzedCount = stats.analyzed + 1;
      saveStats({ ...stats, analyzed: newAnalyzedCount });

      toast({
        title: "Branding Audit Concluído!",
        description: `Auditoria de marca gerada com Score Comercial: ${data.analysis.commercialScore}!`,
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro na Auditoria Visual",
        description: err.message || "Não foi possível rodar a auditoria de marca com Inteligência Artificial.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Sync prospects to Supabase pipeline
  const syncLeadToCRM = async (lead: Prospect) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/prospects/sync-crm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          name: lead.name,
          email: lead.email || "",
          phone: lead.phone || "",
          status: "novo",
          origin: "google_maps",
          message: {
            category: lead.category,
            address: lead.address,
            website: lead.website,
            instagram: lead.instagram,
            rating: lead.rating,
            reviews_count: lead.reviews_count,
            ai_analysis: lead.analysis
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao sincronizar com CRM");
      }

      updateProspectStatus(lead.name, "No CRM");
      saveStats({ ...stats, syncedCrm: stats.syncedCrm + 1 });

      toast({
        title: "Sincronizado no CRM!",
        description: `Lead "${lead.name}" foi registrado com sucesso no pipeline de vendas!`,
      });

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro de Sincronização",
        description: err.message || "Erro ao integrar lead com Supabase CRM.",
        variant: "destructive"
      });
    }
  };

  // Dispatches message to WhatsApp / wa.me fallback
  const handleSendWhatsApp = async () => {
    if (!selectedProspect) return;
    
    setIsSendingWa(true);
    localStorage.setItem("implotter_wa_url", waApiUrl);
    localStorage.setItem("implotter_wa_key", waApiKey);
    localStorage.setItem("implotter_wa_instance", waInstance);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");

      const API_URL = getApiUrl();
      const response = await fetch(`${API_URL}/api/prospects/whatsapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          phone: selectedProspect.whatsapp || selectedProspect.phone,
          message: pitchText,
          apiUrl: waApiUrl,
          apiKey: waApiKey,
          instance: waInstance
        })
      });

      const data = await response.json();

      if (data.success && data.mode === "evolution_api") {
        toast({
          title: "Mensagem Enviada!",
          description: `Disparo efetuado com sucesso via Evolution API!`,
        });
        updateProspectStatus(selectedProspect.name, "Mensagem Enviada");
        saveStats({ ...stats, whatsappSent: stats.whatsappSent + 1 });
      } else if (data.mode === "web_fallback" || data.mode === "manual_link") {
        toast({
          title: "Abrindo WhatsApp Web",
          description: "Conectando ao canal direto do cliente...",
        });
        const win = window.open(data.url || data.webUrl || data.mobileUrl, "_blank");
        if (win) win.focus();
        
        updateProspectStatus(selectedProspect.name, "Contato Iniciado");
        saveStats({ ...stats, whatsappSent: stats.whatsappSent + 1 });
      }

    } catch (err: any) {
      console.error(err);
      toast({
        title: "Erro de WhatsApp",
        description: err.message || "Não foi possível enviar a mensagem.",
        variant: "destructive"
      });
    } finally {
      setIsSendingWa(false);
    }
  };

  const updateProspectStatus = (name: string, newStatus: string) => {
    const updated = prospects.map(p => {
      if (p.name === name) {
        const item = { ...p, status: newStatus };
        if (selectedProspect && selectedProspect.name === name) {
          setSelectedProspect(item);
        }
        return item;
      }
      return p;
    });
    saveProspects(updated);
  };

  const handleColorChange = (type: "primary" | "secondary", hex: string) => {
    if (!selectedProspect) return;
    const colors = selectedProspect.customColors || { primary: "#1e3a8a", secondary: "#3b82f6" };
    colors[type] = hex;
    
    const updated = prospects.map(p => {
      if (p.name === selectedProspect.name) {
        return { ...p, customColors: { ...colors } };
      }
      return p;
    });
    
    saveProspects(updated);
    setSelectedProspect({ ...selectedProspect, customColors: { ...colors } });
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-highlight to-highlight-glow flex items-center justify-center text-white shadow-glow">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="space-y-0.5">
            <h1 className="font-display text-4xl font-black text-foreground tracking-tighter uppercase">
              Prospecção <span className="text-highlight">Inteligente</span>
            </h1>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] opacity-60">
              Captura do Google Maps + Inteligência Artificial + WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { title: "Empresas Capturadas", value: stats.totalScraped, icon: Search, gradient: "from-blue-500/10 to-blue-500/0 text-blue-400" },
          { title: "Auditorias IA Efetuadas", value: stats.analyzed, icon: Sparkles, gradient: "from-purple-500/10 to-purple-500/0 text-purple-400" },
          { title: "Contatos Iniciados", value: stats.whatsappSent, icon: Send, gradient: "from-emerald-500/10 to-emerald-500/0 text-emerald-400" },
          { title: "Sincronizados no CRM", value: stats.syncedCrm, icon: Database, gradient: "from-amber-500/10 to-amber-500/0 text-amber-400" },
        ].map((c, i) => (
          <div key={i} className={cn("bg-card border border-white/5 rounded-3xl p-6 relative overflow-hidden group shadow-xl bg-gradient-to-br", c.gradient)}>
            <div className="absolute top-6 right-6 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center opacity-60 group-hover:scale-110 transition-transform">
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest mb-1">{c.title}</p>
            <h3 className="font-display text-3xl font-black text-foreground">{c.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Scraper Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-card-premium rounded-3xl border border-white/5 p-6 shadow-2xl relative overflow-hidden bg-mesh-gradient">
            <h3 className="font-display font-black text-lg text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-5 h-5 text-highlight" /> Parâmetros de Captura
            </h3>
            
            <div className="space-y-4">
              {/* Presets Grid */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block">Selecione o Nicho Local</label>
                <div className="grid grid-cols-2 gap-2">
                  {NY_PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => setKeyword(p.value)}
                      className={cn(
                        "py-2 px-3 text-left rounded-xl text-[11px] font-bold border transition-all truncate",
                        keyword === p.value 
                          ? "bg-highlight/10 text-highlight border-highlight/30" 
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Keyword */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Palavra-chave Personalizada</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    placeholder="Ex: Clínicas odontológicas, Academias"
                    className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-highlight/40 outline-none text-white font-semibold"
                  />
                </div>
              </div>

              {/* City */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Cidade de Busca</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Ex: São Paulo, Rio de Janeiro"
                    className="w-full bg-[#12121a] border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm focus:border-highlight/40 outline-none text-white font-semibold"
                  />
                </div>
              </div>

              {/* Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quantidade de Resultados</label>
                  <span className="text-xs font-bold text-highlight">{limit} leads</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value))}
                  className="w-full accent-highlight bg-white/10 h-1 rounded-lg cursor-pointer"
                />
              </div>

              {/* Simulation Mode */}
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-foreground">Modo Demonstração</h4>
                  <p className="text-[9px] text-muted-foreground">Velocidade ultrarrápida, livre de bloqueios</p>
                </div>
                <input
                  type="checkbox"
                  checked={simulate}
                  onChange={(e) => setSimulate(e.target.checked)}
                  className="w-4 h-4 rounded bg-background border-white/10 accent-highlight cursor-pointer"
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={startScraping}
                disabled={isScraping}
                className={cn(
                  "w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs shadow-glow transition-all",
                  isScraping 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-gradient-to-r from-highlight to-highlight-glow text-white hover:opacity-90"
                )}
              >
                {isScraping ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> RASTREANDO LEADS...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Play className="w-4 h-4" /> EXECUTAR RASTREAMENTO
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Console Output */}
          <div className="bg-[#050508] border border-white/5 rounded-3xl p-4 shadow-xl flex flex-col h-[280px]">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2 mb-2">
              <Terminal className="w-4 h-4 text-highlight" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Console de Operações</span>
              <div className="flex gap-1 ml-auto">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin text-green-400">
              {scrapingLogs.length === 0 ? (
                <div className="text-muted-foreground/40 italic flex h-full items-center justify-center text-center">
                  Aguardando envio de parâmetros para monitoramento...
                </div>
              ) : (
                scrapingLogs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Leads Table Grid */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="bg-card border border-white/5 rounded-[32px] p-6 shadow-2xl min-h-[500px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-display font-black text-xl text-foreground uppercase tracking-tight">Leads Recentes</h3>
                <p className="text-xs text-muted-foreground font-semibold">Tabela de empresas extraídas do Google Maps</p>
              </div>
              {prospects.length > 0 && (
                <button
                  onClick={() => { saveProspects([]); setSelectedProspect(null); setAnalysisPanelOpen(false); }}
                  className="text-[10px] font-bold uppercase tracking-wider text-red-400/80 hover:text-red-400 transition-colors bg-red-500/10 border border-red-500/20 py-2 px-4 rounded-xl"
                >
                  Limpar Resultados
                </button>
              )}
            </div>

            {prospects.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/5 rounded-2xl bg-white/[0.01]">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-muted-foreground/40 mb-4 animate-float-gentle">
                  <Search className="w-8 h-8" />
                </div>
                <h4 className="font-display font-black text-base text-foreground mb-2">Sem Leads no Momento</h4>
                <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                  Insira as palavras-chave e clique no botão de rastreamento para iniciar a prospecção de negócios locais.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto scrollbar-none flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-muted-foreground text-[10px] font-black uppercase tracking-wider">
                      <th className="text-left py-3 px-4">Empresa / Categoria</th>
                      <th className="text-left py-3 px-4">Reputação Google</th>
                      <th className="text-left py-3 px-4">Contatos</th>
                      <th className="text-center py-3 px-4">Ficha / Score</th>
                      <th className="text-right py-3 px-4">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospects.map((p, idx) => (
                      <tr 
                        key={idx} 
                        className={cn(
                          "border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors group",
                          selectedProspect?.name === p.name && "bg-highlight/5 border-highlight/10"
                        )}
                      >
                        {/* Name */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-foreground text-xs leading-normal line-clamp-1 group-hover:text-highlight transition-colors">{p.name}</span>
                            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider">{p.category}</span>
                          </div>
                        </td>
                        
                        {/* Reputation rating */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5 text-amber-400 font-bold text-xs bg-amber-500/10 py-1 px-2 rounded-lg border border-amber-500/20">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {p.rating.toFixed(1)}
                            </div>
                            <span className="text-[10px] font-semibold text-muted-foreground">({p.reviews_count})</span>
                          </div>
                        </td>
                        
                        {/* Contacts */}
                        <td className="py-4 px-4">
                          <div className="flex gap-1">
                            {p.website && (
                              <a href={p.website} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-all" title={p.website}>
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {p.instagram && (
                              <a href={`https://instagram.com/${p.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-all" title={p.instagram}>
                                <Instagram className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {p.phone && (
                              <a href={`tel:${p.phone}`} className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 hover:bg-purple-500/20 transition-all" title={p.phone}>
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </td>
                        
                        {/* Status + Commercial Score */}
                        <td className="py-4 px-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full leading-none",
                              p.status === "Novo" && "bg-blue-500/10 text-blue-400 border border-blue-500/20",
                              p.status === "Analisado" && "bg-purple-500/10 text-purple-400 border border-purple-500/20",
                              p.status === "Mensagem Enviada" && "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
                              p.status === "Contato Iniciado" && "bg-teal-500/10 text-teal-400 border border-teal-500/20",
                              p.status === "No CRM" && "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {p.status}
                            </span>
                            
                            {p.analysis?.commercialScore && (
                              <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-0.5 leading-none",
                                p.analysis.commercialScore === "Quente" && "bg-red-500/20 text-red-400 border border-red-500/30",
                                p.analysis.commercialScore === "Morno" && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
                                p.analysis.commercialScore === "Frio" && "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              )}>
                                {p.analysis.commercialScore === "Quente" ? "🔥 QUENTE" : p.analysis.commercialScore === "Morno" ? "⚡ MORNO" : "❄️ FRIO"}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Table Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex gap-1 justify-end opacity-60 group-hover:opacity-100 transition-opacity">
                            {p.status === "Novo" ? (
                              <Button
                                onClick={() => openAuditConfig(p, idx)}
                                disabled={isAnalyzing}
                                size="sm"
                                className="bg-highlight hover:bg-highlight-glow text-white text-[10px] font-black uppercase tracking-wider py-1.5 px-3 h-auto rounded-lg shadow-glow-sm"
                              >
                                {isAnalyzing && selectedProspect?.name === p.name ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>Auditoria IA <ArrowRight className="w-3 h-3 ml-1" /></>
                                )}
                              </Button>
                            ) : (
                              <Button
                                onClick={() => { setSelectedProspect(p); setPitchText(p.analysis?.personalizedPitch || ""); setAnalysisPanelOpen(true); }}
                                size="sm"
                                variant="outline"
                                className="border-white/5 bg-white/[0.02] text-foreground text-[10px] font-black uppercase tracking-wider py-1.5 px-3 h-auto rounded-lg"
                              >
                                <Eye className="w-3 h-3 mr-1" /> Diagnóstico & Mockup
                              </Button>
                            )}
                            
                            <Button
                              onClick={() => syncLeadToCRM(p)}
                              disabled={p.status === "No CRM"}
                              size="sm"
                              variant="outline"
                              className="border-white/5 bg-white/[0.02] hover:bg-highlight/10 hover:text-highlight transition-all text-muted-foreground text-[10px] font-black uppercase tracking-wider py-1.5 px-2 h-auto rounded-lg"
                              title="Sincronizar com CRM"
                            >
                              <Database className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Part 2: Multimodal AI Brand Audit Setup Modal */}
      {auditModalOpen && auditLead && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#0E0E14] border border-white/5 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-6 relative overflow-hidden bg-mesh-gradient">
            
            <button 
              onClick={() => setAuditModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="text-[9px] font-black text-highlight uppercase tracking-[0.2em] block mb-1">MÓDULO DE AUDITORIA DE MARCA</span>
              <h3 className="font-display font-black text-xl text-white uppercase tracking-tight">Diagnóstico Visual de {auditLead.name}</h3>
              <p className="text-xs text-slate-300 font-semibold mt-1">
                Configure os inputs que serão avaliados pelo robô cognitivo do ImPlotter Studio.
              </p>
            </div>

            <div className="space-y-4">
              {/* Review Comments / Brand observations */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                  Comentários & Histórico do Maps (Input de Avaliações)
                </label>
                <textarea
                  value={auditReviews}
                  onChange={(e) => setAuditReviews(e.target.value)}
                  placeholder="Cole aqui avaliações negativas de fachada ou notas internas sobre a aparência atual deles..."
                  className="w-full h-24 bg-[#12121a] border border-white/10 rounded-2xl p-3 text-xs text-white font-semibold outline-none focus:border-highlight/30 focus:bg-white/[0.04] transition-all resize-none"
                />
              </div>

              {/* Brand photos base64 uploading */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">
                  Fotos da Fachada, Logo ou Posts (Análise Multimodal de Imagem)
                </label>
                
                <div className="grid grid-cols-4 gap-3">
                  {/* Plus zone */}
                  <label className="border-2 border-dashed border-white/10 hover:border-highlight/30 bg-white/[0.01] rounded-2xl h-16 flex flex-col items-center justify-center cursor-pointer transition-colors relative">
                    <input 
                      type="file" 
                      multiple 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      className="hidden" 
                    />
                    <Plus className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[8px] font-bold text-muted-foreground/60 uppercase mt-1">Anexar Foto</span>
                  </label>

                  {/* Previews zone */}
                  {auditPhotos.map((p, idx) => (
                    <div key={idx} className="relative rounded-2xl h-16 border border-white/5 bg-white/[0.02] overflow-hidden group">
                      <img src={p.previewUrl} alt="branding input" className="w-full h-full object-cover" />
                      <button 
                        onClick={() => removeAuditPhoto(idx)}
                        className="absolute inset-0 bg-red-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground font-semibold italic">
                  *A IA analisará a qualidade do design, cores e layout dessas imagens para reportar amadorismos de marca.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setAuditModalOpen(false)}
                variant="outline"
                className="flex-1 rounded-xl h-11 border-white/10 bg-white/5 text-white hover:bg-white/20 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={executeBrandAudit}
                className="flex-1 rounded-xl h-11 bg-gradient-to-r from-highlight to-highlight-glow text-white font-black uppercase tracking-widest text-xs shadow-glow"
              >
                <Sparkles className="w-4 h-4 mr-2" /> GERAR AUDITORIA IA
              </Button>
            </div>

          </div>
        </div>
      )}

      {/* Floating Detailed Drawer: AI Presence Analysis & Interactive Mockups */}
      {analysisPanelOpen && selectedProspect && (
        <div className="fixed inset-0 z-50 bg-[#08080C]/80 backdrop-blur-md flex items-center justify-end animate-fade-in">
          <div className="w-full max-w-5xl h-full bg-[#0E0E14] border-l border-white/5 p-8 overflow-y-auto shadow-2xl relative flex flex-col">
            
            {/* Drawer Close top right */}
            <button 
              onClick={() => setAnalysisPanelOpen(false)}
              className="absolute top-6 right-6 text-white hover:text-white text-xs font-black uppercase tracking-widest bg-white/5 border border-white/15 hover:bg-white/15 p-3 rounded-xl transition-all"
            >
              Fechar Painel ✕
            </button>

            {/* Selected lead branding heading */}
            <div className="flex items-center gap-4 mb-8">
              <div 
                className="w-12 h-12 rounded-xl border flex items-center justify-center font-black text-sm text-white"
                style={{ 
                  backgroundColor: selectedProspect.customColors?.primary || "#1e3a8a",
                  borderColor: selectedProspect.customColors?.secondary || "#3b82f6"
                }}
              >
                {selectedProspect.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="font-display font-black text-2xl text-white uppercase tracking-tight">{selectedProspect.name}</h2>
                <p className="text-[10px] text-slate-300 font-black uppercase tracking-widest">
                  Ficha do Lead & Mockups Personalizados
                </p>
              </div>
            </div>

            {/* Split viewport */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
              
              {/* Drawer Left Column: Score, SWOT Gaps, WhatsApp Pitch Editor */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                
                {/* Score & Verdict Card */}
                {selectedProspect.analysis && (
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-white/5">
                      <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-highlight" /> Diagnóstico Comercial de Marca
                      </h4>
                      
                      {/* Commercial score classification */}
                      <span className={cn(
                        "text-[10px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1 animate-pulse-glow shadow-glow-sm",
                        selectedProspect.analysis.commercialScore === "Quente" && "bg-red-500/20 text-red-400 border border-red-500/40",
                        selectedProspect.analysis.commercialScore === "Morno" && "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
                        selectedProspect.analysis.commercialScore === "Frio" && "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      )}>
                        {selectedProspect.analysis.commercialScore === "Quente" ? (
                          <><Flame className="w-3.5 h-3.5 fill-red-400" /> QUENTE (ALTO POTENCIAL)</>
                        ) : selectedProspect.analysis.commercialScore === "Morno" ? (
                          <><Zap className="w-3.5 h-3.5 fill-yellow-400" /> MORNO (POTENCIAL MÉDIO)</>
                        ) : (
                          <><Snowflake className="w-3.5 h-3.5" /> FRIO (BAIXO RETORNO)</>
                        )}
                      </span>
                    </div>

                    {/* SWOT Pillar progress bars */}
                    {selectedProspect.analysis.visualDiagnostics && (
                      <div className="grid grid-cols-2 gap-4 pb-3 border-b border-white/5">
                        {[
                          { label: "Identidade Visual", key: "visualIdentity" },
                          { label: "Profissionalismo", key: "professionalism" },
                          { label: "Presença Digital", key: "digitalPresence" },
                          { label: "Necessidade de Impressos", key: "printNeeds" }
                        ].map((diag) => {
                          const val = selectedProspect.analysis.visualDiagnostics[diag.key] || 5;
                          return (
                            <div key={diag.key} className="space-y-1">
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className="text-muted-foreground/80">{diag.label}</span>
                                <span className="text-highlight">{val}/10</span>
                              </div>
                              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-highlight to-highlight-glow rounded-full transition-all duration-1000"
                                  style={{ width: `${val * 10}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* weaknesses list (amadorism flags) */}
                    {selectedProspect.analysis.weaknessesIdentified && (
                      <div className="space-y-2">
                        <span className="text-[9px] font-black uppercase tracking-wider text-red-400 block">Sinais de Amadorismo Identificados</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {selectedProspect.analysis.weaknessesIdentified.map((w: string, idx: number) => (
                            <div key={idx} className="flex items-start gap-1.5 text-[10px] font-semibold text-foreground bg-red-500/5 border border-red-500/10 p-2 rounded-xl">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* brand audit verdict narrative */}
                    {selectedProspect.analysis.brandAuditVerdict && (
                      <div className="p-3.5 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground block">Auditoria de Branding Geral</span>
                        <p className="text-[11px] font-semibold text-muted-foreground leading-relaxed italic">
                          "{selectedProspect.analysis.brandAuditVerdict}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* WhatsApp copy-editor */}
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-highlight" /> Mensagem para WhatsApp
                    </label>
                    <span className="text-[10px] font-semibold text-muted-foreground opacity-50">Editor de Pitch Comercial</span>
                  </div>
                  <textarea
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    className="flex-1 min-h-[160px] bg-white/[0.01] border border-white/5 rounded-2xl p-4 text-xs text-foreground font-semibold leading-relaxed outline-none focus:border-highlight/30 focus:bg-white/[0.03] transition-all resize-none font-sans"
                  />
                </div>

                {/* WhatsApp dispatch panel */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-foreground">Configuração de Disparo (Evolution API)</h4>
                    <span className="text-[9px] text-muted-foreground">Salvo automaticamente</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">API URL</span>
                      <input
                        type="text"
                        value={waApiUrl}
                        onChange={(e) => setWaApiUrl(e.target.value)}
                        placeholder="https://api.domain.com"
                        className="bg-[#12121a] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-highlight/20 text-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Instância</span>
                      <input
                        type="text"
                        value={waInstance}
                        onChange={(e) => setWaInstance(e.target.value)}
                        placeholder="implotter"
                        className="bg-[#12121a] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-highlight/20 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase">API Key (Apikey token)</span>
                    <input
                      type="password"
                      value={waApiKey}
                      onChange={(e) => setWaApiKey(e.target.value)}
                      placeholder="evolution-api-secret-key"
                      className="bg-[#12121a] border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-semibold outline-none focus:border-highlight/20 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleSendWhatsApp}
                    disabled={isSendingWa}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
                  >
                    {isSendingWa ? (
                      <><RefreshCw className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Disparar WhatsApp {waApiKey ? "(Via API)" : "(Via Web Link)"}</>
                    )}
                  </Button>
                </div>

              </div>

              {/* Drawer Right Column: Interactive Mockups */}
              <div className="lg:col-span-6 flex flex-col gap-6">
                
                {/* Mockup switcher */}
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Palette className="w-4 h-4 text-highlight" /> Ferramentas de Design & Mockups
                  </h4>
                  <div className="flex gap-1">
                    {[
                      { id: "card", label: "Cartão", icon: Layout },
                      { id: "banner", label: "Banner", icon: Layers }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setActiveMockupType(m.id as any)}
                        className={cn(
                          "py-1 px-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all flex items-center gap-1",
                          activeMockupType === m.id 
                            ? "bg-highlight text-white border-highlight" 
                            : "bg-white/[0.02] border-white/5 text-muted-foreground hover:bg-white/[0.05]"
                        )}
                      >
                        <m.icon className="w-3.5 h-3.5" /> {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mockup rendering board */}
                <div className="bg-[#050508] rounded-[28px] border border-white/5 p-8 flex flex-col items-center justify-center min-h-[340px] relative overflow-hidden bg-blueprint-grid">
                  
                  <div className="absolute top-4 left-4 text-[9px] font-mono font-black text-highlight opacity-30 tracking-widest">GRID SYSTEM_M2</div>
                  <div className="absolute bottom-4 right-4 text-[9px] font-mono font-black text-highlight opacity-30 tracking-widest">IMPLOTTER_HQ_3D</div>
                  
                  {activeMockupType === "card" && (
                    <div className="perspective-1000 flex flex-col items-center gap-6 w-full">
                      
                      <div 
                        className={cn(
                          "w-[340px] h-[200px] preserve-3d transition-transform duration-700 ease-out cursor-pointer relative shadow-glow-strong rounded-2xl border border-white/10",
                          isCardFlipped ? "rotate-y-180" : ""
                        )}
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                      >
                        {/* Front Side */}
                        <div 
                          className="absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col justify-between"
                          style={{ 
                            background: `linear-gradient(135deg, ${selectedProspect.customColors?.primary || "#1e3a8a"}, ${selectedProspect.customColors?.secondary || "#3b82f6"})` 
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-md flex items-center justify-center font-black text-white text-xs border border-white/20">
                              {selectedProspect.name.split(' ')[0][0].toUpperCase()}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/50">MOCKUP EXCLUSIVO</span>
                          </div>
                          
                          <div className="space-y-0.5">
                            <h4 className="font-display font-black text-lg text-white tracking-tight leading-none uppercase">{selectedProspect.name}</h4>
                            <p className="text-[9px] font-bold text-white/75 uppercase tracking-widest">{selectedProspect.category}</p>
                          </div>

                          <div className="flex justify-between items-center text-[8px] font-semibold text-white/60">
                            <span>IMPLOTTER_DESIGN</span>
                            <span>★★★ PREMIUM LINE</span>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div 
                          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-6 bg-[#0E0E14] text-foreground flex flex-col justify-between border-2"
                          style={{ borderColor: selectedProspect.customColors?.primary || "#1e3a8a" }}
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-6 h-6 rounded-md flex items-center justify-center font-black text-[10px] text-white"
                              style={{ backgroundColor: selectedProspect.customColors?.primary }}
                            >
                              {selectedProspect.name.split(' ')[0][0].toUpperCase()}
                            </div>
                            <h5 className="font-display font-black text-xs text-foreground uppercase tracking-wider">{selectedProspect.name}</h5>
                          </div>

                          <div className="space-y-2 text-[10px] font-semibold text-muted-foreground leading-normal">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-highlight shrink-0" />
                              <span className="line-clamp-1">{selectedProspect.address}</span>
                            </div>
                            {selectedProspect.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-highlight shrink-0" />
                                <span>{selectedProspect.phone}</span>
                              </div>
                            )}
                            {selectedProspect.website && (
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5 text-highlight shrink-0" />
                                <span className="line-clamp-1">{selectedProspect.website.replace('https://', '').replace('www.', '')}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[7px] font-black text-muted-foreground uppercase tracking-widest pt-1.5 border-t border-white/5">
                            <span>Fale com nosso atendimento</span>
                            <span className="text-highlight">implotter.com</span>
                          </div>
                        </div>

                      </div>

                      <button 
                        onClick={() => setIsCardFlipped(!isCardFlipped)}
                        className="text-[10px] font-black uppercase tracking-wider text-highlight flex items-center gap-1.5 bg-highlight/10 border border-highlight/20 py-2 px-4 rounded-xl hover:bg-highlight/20 transition-all"
                      >
                        <RotateCw className="w-3.5 h-3.5" /> Girar Cartão de Visita
                      </button>
                    </div>
                  )}

                  {activeMockupType === "banner" && (
                    <div className="flex flex-col items-center gap-4 w-full">
                      <div className="flex gap-6 items-end">
                        
                        <div className="relative w-[130px] h-[250px] bg-card border border-white/10 shadow-glow-strong flex flex-col overflow-hidden rounded-sm">
                          
                          <div 
                            className="flex-1 p-4 flex flex-col justify-between text-white"
                            style={{ 
                              background: `linear-gradient(180deg, ${selectedProspect.customColors?.primary || "#1e3a8a"}, ${selectedProspect.customColors?.secondary || "#3b82f6"})` 
                            }}
                          >
                            <div className="text-center">
                              <div className="w-7 h-7 rounded-full bg-white/10 mx-auto flex items-center justify-center font-black text-xs border border-white/20 mb-1.5">
                                {selectedProspect.name.split(' ')[0][0].toUpperCase()}
                              </div>
                              <h4 className="font-display font-black text-[9px] uppercase tracking-wider line-clamp-2 leading-tight">{selectedProspect.name}</h4>
                            </div>

                            <div className="text-center py-2 border-y border-white/10 my-2">
                              <p className="text-[6px] font-black uppercase tracking-[0.2em] text-white/80 leading-none">SEU DESIGN</p>
                              <p className="text-[8px] font-black uppercase text-white tracking-widest mt-1">AQUI</p>
                            </div>

                            <div className="text-center text-[6px] font-bold text-white/50 leading-tight">
                              <p>{selectedProspect.address.split(',')[0]}</p>
                              <p className="font-black text-white mt-1 uppercase tracking-widest">{selectedProspect.category}</p>
                            </div>
                          </div>

                        </div>

                        <div className="max-w-[220px] bg-white/[0.02] border border-white/5 p-4 rounded-2xl text-[11px] leading-relaxed text-muted-foreground font-semibold">
                          <p className="font-bold text-foreground mb-1 text-xs">Banner Roll-Up Corporativo</p>
                          Excelente para atrair clientes locais na entrada do estabelecimento. Ideal para consultórios, academias ou escritórios.
                        </div>

                      </div>
                    </div>
                  )}

                </div>

                {/* Color customizer */}
                <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-white">Paleta de Cores Sugerida por IA</h5>
                    <span className="text-[9px] text-slate-300">Clique para customizar</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-[#050508] border border-white/5 rounded-xl p-3">
                      <div 
                        className="w-8 h-8 rounded-lg shrink-0 border border-white/10"
                        style={{ backgroundColor: selectedProspect.customColors?.primary || "#1e3a8a" }}
                      />
                      <div className="flex-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase block leading-none mb-1">Primária (Branding)</span>
                        <input
                          type="text"
                          value={selectedProspect.customColors?.primary || "#1e3a8a"}
                          onChange={(e) => handleColorChange("primary", e.target.value)}
                          className="bg-transparent text-xs font-black uppercase tracking-wider text-foreground w-20 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 bg-[#050508] border border-white/5 rounded-xl p-3">
                      <div 
                        className="w-8 h-8 rounded-lg shrink-0 border border-white/10"
                        style={{ backgroundColor: selectedProspect.customColors?.secondary || "#3b82f6" }}
                      />
                      <div className="flex-1">
                        <span className="text-[8px] font-black text-muted-foreground uppercase block leading-none mb-1">Destaque (Accent)</span>
                        <input
                          type="text"
                          value={selectedProspect.customColors?.secondary || "#3b82f6"}
                          onChange={(e) => handleColorChange("secondary", e.target.value)}
                          className="bg-transparent text-xs font-black uppercase tracking-wider text-foreground w-20 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Automatic Sugestions based on Sector/Niche (Part 2 Suggestions list) */}
                {selectedProspect.analysis?.nicheProducts && (
                  <div className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <h5 className="text-[10px] font-black uppercase tracking-wider text-white mb-3 flex items-center gap-1">
                      <Shield className="w-4 h-4 text-highlight" /> Sugestões de Impressos para seu Nicho
                    </h5>
                    <div className="grid grid-cols-2 gap-3">
                      {selectedProspect.analysis.nicheProducts.map((p: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col justify-between">
                          <h6 className="text-xs font-bold text-foreground mb-1 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5 text-highlight shrink-0" /> {p.productName}
                          </h6>
                          <p className="text-[9px] text-muted-foreground font-semibold leading-relaxed">{p.benefit}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

            </div>

          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default AdminProspects;
