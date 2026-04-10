import { useEffect, useState, useRef } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Upload, Image, Film, Info, X, Type, BarChart3, Palette, Settings } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface HeroSlide {
  id: string;
  title: string | null;
  subtitle: string | null;
  media_url: string;
  media_type: string;
  link_url: string | null;
  link_text: string | null;
  is_active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

interface HeroSettings {
  hero_badge_text: string;
  hero_title: string;
  hero_subtitle: string;
  hero_button_text: string;
  hero_button_link: string;
  hero_button2_text: string;
  hero_button2_link: string;
  hero_stat_1_value: string;
  hero_stat_1_label: string;
  hero_stat_2_value: string;
  hero_stat_2_label: string;
  hero_stat_3_value: string;
  hero_stat_3_label: string;
  // Visual customization
  hero_bg_gradient: string;
  hero_title_color: string;
  hero_subtitle_color: string;
  hero_accent_color: string;
  hero_badge_bg: string;
  hero_badge_color: string;
  hero_title_font: string;
  hero_body_font: string;
  hero_title_size: string;
  hero_subtitle_size: string;
  hero_spacing: string;
}

const defaultHeroSettings: HeroSettings = {
  hero_badge_text: "Qualidade profissional garantida",
  hero_title: "Impressão profissional para destacar sua marca",
  hero_subtitle: "Cartões, banners, adesivos, panfletos e materiais gráficos com qualidade premium, agilidade e atendimento especializado.",
  hero_button_text: "Ver produtos",
  hero_button_link: "/loja",
  hero_button2_text: "Solicitar orçamento",
  hero_button2_link: "/fale-conosco",
  hero_stat_1_value: "1.250+",
  hero_stat_1_label: "Clientes atendidos",
  hero_stat_2_value: "3.000+",
  hero_stat_2_label: "Pedidos entregues",
  hero_stat_3_value: "4.9",
  hero_stat_3_label: "Avaliação média",
  // Visual defaults
  hero_bg_gradient: "bg-gradient-hero",
  hero_title_color: "text-foreground",
  hero_subtitle_color: "text-muted-foreground",
  hero_accent_color: "text-gradient-accent",
  hero_badge_bg: "bg-highlight/10",
  hero_badge_color: "text-highlight",
  hero_title_font: "font-display",
  hero_body_font: "font-sans",
  hero_title_size: "text-3xl sm:text-4xl md:text-5xl lg:text-6xl",
  hero_subtitle_size: "text-lg md:text-xl",
  hero_spacing: "normal",
};

const heroSettingsKeys = Object.keys(defaultHeroSettings) as (keyof HeroSettings)[];

const IDEAL_WIDTH = 800;
const IDEAL_HEIGHT = 600;
const ASPECT_RATIO = "4:3";
const MAX_FILE_MB = 20;

const AdminHeroSlides = () => {
  const { toast } = useToast();
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkText, setNewLinkText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Hero text settings
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultHeroSettings);
  const [savingHero, setSavingHero] = useState(false);

  const fetchSlides = async () => {
    const { data } = await supabase
      .from("hero_slides")
      .select("*")
      .order("sort_order");
    setSlides((data as HeroSlide[]) || []);
    setLoading(false);
  };

  const fetchHeroSettings = async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key, value")
      .in("key", heroSettingsKeys);
    
    if (data) {
      const settings = { ...defaultHeroSettings };
      data.forEach((item) => {
        if (item.key in settings && item.value) {
          (settings as any)[item.key] = item.value;
        }
      });
      setHeroSettings(settings);
    }
  };

  const saveHeroSettings = async () => {
    setSavingHero(true);
    for (const key of heroSettingsKeys) {
      const value = heroSettings[key] || "";
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();
      
      if (existing) {
        await supabase.from("site_settings").update({ value, updated_at: new Date().toISOString() }).eq("key", key);
      } else {
        await supabase.from("site_settings").insert({ key, value });
      }
    }
    toast({ title: "Textos do Hero salvos!" });
    setSavingHero(false);
  };

  useEffect(() => { 
    fetchSlides(); 
    fetchHeroSettings();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Máximo permitido: ${MAX_FILE_MB}MB`, variant: "destructive" });
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      toast({ title: "Formato não suportado", description: "Envie uma imagem (JPG, PNG, WebP) ou vídeo (MP4, WebM)", variant: "destructive" });
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("hero-media")
      .upload(fileName, file, { contentType: file.type });

    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("hero-media").getPublicUrl(fileName);

    const { error: insertError } = await supabase.from("hero_slides").insert({
      media_url: urlData.publicUrl,
      media_type: isVideo ? "video" : "image",
      sort_order: slides.length,
      is_active: true,
      link_url: newLinkUrl.trim() || null,
      link_text: newLinkText.trim() || null,
    });

    if (insertError) {
      toast({ title: "Erro ao salvar slide", description: insertError.message, variant: "destructive" });
    } else {
      toast({ title: "Slide adicionado!" });
      setNewLinkUrl("");
      setNewLinkText("");
      fetchSlides();
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const toggleActive = async (slide: HeroSlide) => {
    await supabase.from("hero_slides").update({ is_active: !slide.is_active }).eq("id", slide.id);
    fetchSlides();
  };

  const deleteSlide = async (slide: HeroSlide) => {
    if (!confirm("Tem certeza que deseja excluir este slide?")) return;
    // Extract filename from URL to delete from storage
    const urlParts = slide.media_url.split("/");
    const fileName = urlParts[urlParts.length - 1];
    await supabase.storage.from("hero-media").remove([fileName]);
    await supabase.from("hero_slides").delete().eq("id", slide.id);
    toast({ title: "Slide removido!" });
    fetchSlides();
  };

  const moveSlide = async (index: number, direction: "up" | "down") => {
    const newSlides = [...slides];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSlides.length) return;

    const temp = newSlides[index].sort_order;
    newSlides[index].sort_order = newSlides[swapIndex].sort_order;
    newSlides[swapIndex].sort_order = temp;

    await Promise.all([
      supabase.from("hero_slides").update({ sort_order: newSlides[index].sort_order }).eq("id", newSlides[index].id),
      supabase.from("hero_slides").update({ sort_order: newSlides[swapIndex].sort_order }).eq("id", newSlides[swapIndex].id),
    ]);
    fetchSlides();
  };

  const saveSlideDetails = async () => {
    if (!editingSlide) return;
    await supabase.from("hero_slides").update({
      title: editingSlide.title,
      subtitle: editingSlide.subtitle,
      link_url: editingSlide.link_url,
      link_text: editingSlide.link_text,
      starts_at: editingSlide.starts_at || null,
      ends_at: editingSlide.ends_at || null,
      updated_at: new Date().toISOString(),
    }).eq("id", editingSlide.id);
    toast({ title: "Slide atualizado!" });
    setEditingSlide(null);
    fetchSlides();
  };

  const formatDatetimeLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const parseDatetimeLocal = (value: string): string | null => {
    if (!value) return null;
    const [datePart, timePart] = value.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    const d = new Date(year, month - 1, day, hours, minutes);
    return d.toISOString();
  };

  const isSlideScheduled = (slide: HeroSlide) => {
    return slide.starts_at || slide.ends_at;
  };

  const getScheduleStatus = (slide: HeroSlide) => {
    const now = new Date();
    if (slide.starts_at && new Date(slide.starts_at) > now) return "agendado";
    if (slide.ends_at && new Date(slide.ends_at) < now) return "expirado";
    if (slide.starts_at || slide.ends_at) return "ativo";
    return null;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Hero / Impressora</h1>
            <p className="text-muted-foreground mt-1">Gerencie as imagens e vídeos que aparecem na animação da impressora na Home</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Hero Text Settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Type className="w-5 h-5 text-highlight" />
                <h2 className="font-display font-semibold text-foreground">Textos do Hero</h2>
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Badge (etiqueta superior)</label>
                  <Input value={heroSettings.hero_badge_text} onChange={e => setHeroSettings(prev => ({ ...prev, hero_badge_text: e.target.value }))} placeholder="Ex: Qualidade profissional garantida" className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Título Principal</label>
                  <Textarea value={heroSettings.hero_title} onChange={e => setHeroSettings(prev => ({ ...prev, hero_title: e.target.value }))} placeholder="Ex: Impressão profissional para destacar sua marca" className="mt-1" rows={2} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Subtítulo</label>
                  <Textarea value={heroSettings.hero_subtitle} onChange={e => setHeroSettings(prev => ({ ...prev, hero_subtitle: e.target.value }))} placeholder="Descrição abaixo do título" className="mt-1" rows={3} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Texto Botão Principal</label>
                    <Input value={heroSettings.hero_button_text} onChange={e => setHeroSettings(prev => ({ ...prev, hero_button_text: e.target.value }))} placeholder="Ver produtos" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Link Botão Principal</label>
                    <Input value={heroSettings.hero_button_link} onChange={e => setHeroSettings(prev => ({ ...prev, hero_button_link: e.target.value }))} placeholder="/loja" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Texto Botão Secundário</label>
                    <Input value={heroSettings.hero_button2_text} onChange={e => setHeroSettings(prev => ({ ...prev, hero_button2_text: e.target.value }))} placeholder="Solicitar orçamento" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Link Botão Secundário</label>
                    <Input value={heroSettings.hero_button2_link} onChange={e => setHeroSettings(prev => ({ ...prev, hero_button2_link: e.target.value }))} placeholder="/fale-conosco" className="mt-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-success" />
                <h2 className="font-display font-semibold text-foreground">Estatísticas do Hero</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                  <label className="text-sm font-medium text-foreground">Estatística 1</label>
                  <Input value={heroSettings.hero_stat_1_value} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_1_value: e.target.value }))} placeholder="1.250+" />
                  <Input value={heroSettings.hero_stat_1_label} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_1_label: e.target.value }))} placeholder="Clientes atendidos" />
                </div>
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                  <label className="text-sm font-medium text-foreground">Estatística 2</label>
                  <Input value={heroSettings.hero_stat_2_value} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_2_value: e.target.value }))} placeholder="3.000+" />
                  <Input value={heroSettings.hero_stat_2_label} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_2_label: e.target.value }))} placeholder="Pedidos entregues" />
                </div>
                <div className="space-y-2 p-3 bg-secondary/50 rounded-lg">
                  <label className="text-sm font-medium text-foreground">Estatística 3</label>
                  <Input value={heroSettings.hero_stat_3_value} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_3_value: e.target.value }))} placeholder="4.9" />
                  <Input value={heroSettings.hero_stat_3_label} onChange={e => setHeroSettings(prev => ({ ...prev, hero_stat_3_label: e.target.value }))} placeholder="Avaliação média" />
                </div>
              </div>
              <Button variant="hero" size="lg" onClick={saveHeroSettings} disabled={savingHero} className="w-full">
                {savingHero ? "Salvando..." : "Salvar Textos e Estatísticas"}
              </Button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Visual Settings */}
            <div className="bg-card rounded-xl border border-border p-5 space-y-5">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-highlight" />
                <h2 className="font-display font-semibold text-foreground">Aparência do Hero</h2>
              </div>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Fonte do Título</label>
                    <Input value={heroSettings.hero_title_font} onChange={e => setHeroSettings(prev => ({ ...prev, hero_title_font: e.target.value }))} placeholder="Ex: font-display" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Fonte do Texto</label>
                    <Input value={heroSettings.hero_body_font} onChange={e => setHeroSettings(prev => ({ ...prev, hero_body_font: e.target.value }))} placeholder="Ex: font-sans" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Cor do Título</label>
                    <Input value={heroSettings.hero_title_color} onChange={e => setHeroSettings(prev => ({ ...prev, hero_title_color: e.target.value }))} placeholder="Ex: text-foreground" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Destaque do Título</label>
                    <Input value={heroSettings.hero_accent_color} onChange={e => setHeroSettings(prev => ({ ...prev, hero_accent_color: e.target.value }))} placeholder="Ex: text-gradient-accent" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Cor do Subtítulo</label>
                    <Input value={heroSettings.hero_subtitle_color} onChange={e => setHeroSettings(prev => ({ ...prev, hero_subtitle_color: e.target.value }))} placeholder="Ex: text-muted-foreground" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Fundo</label>
                    <Input value={heroSettings.hero_bg_gradient} onChange={e => setHeroSettings(prev => ({ ...prev, hero_bg_gradient: e.target.value }))} placeholder="Ex: bg-gradient-hero" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Fundo do Badge</label>
                    <Input value={heroSettings.hero_badge_bg} onChange={e => setHeroSettings(prev => ({ ...prev, hero_badge_bg: e.target.value }))} placeholder="Ex: bg-highlight/10" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Cor do Badge</label>
                    <Input value={heroSettings.hero_badge_color} onChange={e => setHeroSettings(prev => ({ ...prev, hero_badge_color: e.target.value }))} placeholder="Ex: text-highlight" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">Tamanho do Título</label>
                    <Input value={heroSettings.hero_title_size} onChange={e => setHeroSettings(prev => ({ ...prev, hero_title_size: e.target.value }))} placeholder="Ex: text-3xl sm:text-4xl md:text-5xl lg:text-6xl" className="mt-1" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Tamanho do Subtítulo</label>
                    <Input value={heroSettings.hero_subtitle_size} onChange={e => setHeroSettings(prev => ({ ...prev, hero_subtitle_size: e.target.value }))} placeholder="Ex: text-lg md:text-xl" className="mt-1" />
                  </div>
                </div>
              </div>
              <Button variant="hero" size="lg" onClick={saveHeroSettings} disabled={savingHero} className="w-full">
                {savingHero ? "Salvando..." : "Salvar Aparência"}
              </Button>
            </div>
          </div>
        </div>

        {/* Size guidance */}
        <div className="bg-highlight/5 border border-highlight/20 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-highlight mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-semibold text-foreground">Tamanho ideal das imagens</p>
            <p className="text-muted-foreground">
              <strong>{IDEAL_WIDTH} × {IDEAL_HEIGHT}px</strong> (proporção {ASPECT_RATIO}). 
              Formatos aceitos: <strong>JPG, PNG, WebP</strong> para imagens e <strong>MP4, WebM</strong> para vídeos. 
              Tamanho máximo: <strong>{MAX_FILE_MB}MB</strong>. 
              Imagens serão exibidas dentro da animação da impressora na seção Hero da Home.
            </p>
          </div>
        </div>

        {/* Upload section */}
        <div className="bg-card rounded-xl border border-border p-5 space-y-4">
          <h2 className="font-display font-semibold text-foreground text-sm">Novo Slide</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Link ao clicar (opcional)</label>
              <Input
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="/loja ou https://..."
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Texto do botão (opcional)</label>
              <Input
                value={newLinkText}
                onChange={e => setNewLinkText(e.target.value)}
                placeholder="Ex: Ver oferta"
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              variant="hero"
              size="lg"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" /> Enviar imagem ou vídeo
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Slides grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
          </div>
        ) : slides.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border border-border">
            <Image className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Nenhum slide cadastrado</p>
            <p className="text-sm text-muted-foreground/60 mt-1">Clique em "Enviar imagem ou vídeo" para começar</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {slides.map((slide, index) => (
              <motion.div
                key={slide.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-card rounded-xl border border-border p-4 flex items-center gap-4 transition-all ${!slide.is_active ? "opacity-50" : ""}`}
              >
                {/* Reorder controls */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveSlide(index, "up")}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
                  >
                    ▲
                  </button>
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 mx-auto" />
                  <button
                    onClick={() => moveSlide(index, "down")}
                    disabled={index === slides.length - 1}
                    className="p-1 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground"
                  >
                    ▼
                  </button>
                </div>

                {/* Thumbnail */}
                <div className="w-32 h-24 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border">
                  {slide.media_type === "video" ? (
                    <video src={slide.media_url} className="w-full h-full object-cover" muted />
                  ) : (
                    <img src={slide.media_url} alt={slide.title || "Slide"} className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {slide.media_type === "video" ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-highlight/10 text-highlight px-2 py-0.5 rounded-full font-medium">
                        <Film className="w-3 h-3" /> Vídeo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                        <Image className="w-3 h-3" /> Imagem
                      </span>
                    )}
                    {!slide.is_active && (
                      <span className="text-xs text-destructive font-medium">Inativo</span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">
                    {slide.title || "Sem título"}
                  </p>
                  {slide.subtitle && (
                    <p className="text-xs text-muted-foreground truncate">{slide.subtitle}</p>
                  )}
                  {slide.link_url && (
                    <p className="text-xs text-highlight truncate mt-0.5">🔗 {slide.link_url}</p>
                  )}
                  {isSlideScheduled(slide) && (
                    <p className={`text-xs mt-0.5 font-medium ${
                      getScheduleStatus(slide) === "agendado" ? "text-highlight" :
                      getScheduleStatus(slide) === "expirado" ? "text-destructive" : "text-success"
                    }`}>
                      ⏰ {getScheduleStatus(slide) === "agendado" ? "Agendado" : getScheduleStatus(slide) === "expirado" ? "Expirado" : "Programado"}
                      {slide.starts_at && ` • Início: ${new Date(slide.starts_at).toLocaleString("pt-BR")}`}
                      {slide.ends_at && ` • Fim: ${new Date(slide.ends_at).toLocaleString("pt-BR")}`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => setEditingSlide(slide)} title="Editar">
                    <Plus className="w-4 h-4 rotate-45" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toggleActive(slide)} title={slide.is_active ? "Desativar" : "Ativar"}>
                    {slide.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteSlide(slide)} className="text-destructive hover:text-destructive" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        <AnimatePresence>
          {editingSlide && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
              onClick={() => setEditingSlide(null)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-card border border-border rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-4"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-lg font-bold text-foreground">Editar Slide</h2>
                  <button onClick={() => setEditingSlide(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Preview */}
                <div className="w-full aspect-[4/3] rounded-lg overflow-hidden bg-secondary border border-border">
                  {editingSlide.media_type === "video" ? (
                    <video src={editingSlide.media_url} className="w-full h-full object-cover" controls muted />
                  ) : (
                    <img src={editingSlide.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Título (opcional)</label>
                  <Input
                    value={editingSlide.title || ""}
                    onChange={e => setEditingSlide({ ...editingSlide, title: e.target.value })}
                    placeholder="Ex: Promoção de cartões de visita"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Subtítulo (opcional)</label>
                  <Input
                    value={editingSlide.subtitle || ""}
                    onChange={e => setEditingSlide({ ...editingSlide, subtitle: e.target.value })}
                    placeholder="Ex: 50% de desconto nesta semana"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Link (opcional)</label>
                  <Input
                    value={editingSlide.link_url || ""}
                    onChange={e => setEditingSlide({ ...editingSlide, link_url: e.target.value })}
                    placeholder="/loja ou https://..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">Texto do botão (opcional)</label>
                  <Input
                    value={editingSlide.link_text || ""}
                    onChange={e => setEditingSlide({ ...editingSlide, link_text: e.target.value })}
                    placeholder="Ex: Ver oferta"
                    className="mt-1"
                  />
                </div>

                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">⏰ Programação</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data/hora início</label>
                      <Input
                        type="datetime-local"
                        value={formatDatetimeLocal(editingSlide.starts_at)}
                        onChange={e => setEditingSlide({ ...editingSlide, starts_at: parseDatetimeLocal(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Data/hora fim</label>
                      <Input
                        type="datetime-local"
                        value={formatDatetimeLocal(editingSlide.ends_at)}
                        onChange={e => setEditingSlide({ ...editingSlide, ends_at: parseDatetimeLocal(e.target.value) })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Deixe vazio para exibir sempre. Se preenchido, o slide só aparece dentro do período.</p>
                </div>

                <Button variant="hero" className="w-full" onClick={saveSlideDetails}>
                  Salvar alterações
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
};

export default AdminHeroSlides;
