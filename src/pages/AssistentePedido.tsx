import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import PublicLayout from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, RotateCcw, ShoppingCart, Eye, FileText, Sparkles, CheckCircle2 } from "lucide-react";

/* ── wizard config ── */
interface Step {
  question: string;
  options: { label: string; value: string; icon?: string }[];
}

const STEPS: Step[] = [
  {
    question: "O que você precisa?",
    options: [
      { label: "Divulgar minha empresa", value: "divulgacao", icon: "📢" },
      { label: "Material para evento", value: "evento", icon: "🎉" },
      { label: "Fachada / Banner", value: "fachada", icon: "🏗️" },
      { label: "Etiquetas / Adesivos", value: "etiquetas", icon: "🏷️" },
      { label: "Material para loja", value: "loja", icon: "🛍️" },
      { label: "Outro", value: "outro", icon: "💡" },
    ],
  },
  {
    question: "Qual tipo de material?",
    options: [], // dynamic – filled based on step 0
  },
  {
    question: "Qual a quantidade aproximada?",
    options: [
      { label: "Poucas unidades (1–50)", value: "pequeno", icon: "📦" },
      { label: "Média (50–500)", value: "medio", icon: "📦" },
      { label: "Grande (500+)", value: "grande", icon: "📦" },
      { label: "Ainda não sei", value: "indefinido", icon: "🤔" },
    ],
  },
];

const MATERIAL_MAP: Record<string, { label: string; value: string; icon: string }[]> = {
  divulgacao: [
    { label: "Cartão de Visita", value: "cartao", icon: "💳" },
    { label: "Panfleto / Flyer", value: "panfleto", icon: "📄" },
    { label: "Folder", value: "folder", icon: "📂" },
    { label: "Papel Timbrado", value: "timbrado", icon: "📝" },
    { label: "Receituário", value: "receituario", icon: "📋" },
  ],
  evento: [
    { label: "Banner", value: "banner", icon: "🖼️" },
    { label: "Convite", value: "convite", icon: "💌" },
    { label: "Adesivo", value: "adesivo", icon: "🏷️" },
    { label: "Panfleto / Flyer", value: "panfleto", icon: "📄" },
  ],
  fachada: [
    { label: "Banner Lona", value: "banner_lona", icon: "🖼️" },
    { label: "Faixa", value: "faixa", icon: "📏" },
    { label: "Adesivo Grande Formato", value: "adesivo_grande", icon: "🏷️" },
    { label: "Placa", value: "placa", icon: "🪧" },
  ],
  etiquetas: [
    { label: "Adesivo", value: "adesivo", icon: "🏷️" },
    { label: "Etiqueta", value: "etiqueta", icon: "🏷️" },
    { label: "Rótulo", value: "rotulo", icon: "🏷️" },
  ],
  loja: [
    { label: "Cartão de Visita", value: "cartao", icon: "💳" },
    { label: "Banner", value: "banner", icon: "🖼️" },
    { label: "Adesivo", value: "adesivo", icon: "🏷️" },
    { label: "Etiqueta", value: "etiqueta", icon: "🏷️" },
    { label: "Panfleto", value: "panfleto", icon: "📄" },
  ],
  outro: [
    { label: "Cartão de Visita", value: "cartao", icon: "💳" },
    { label: "Panfleto / Flyer", value: "panfleto", icon: "📄" },
    { label: "Adesivo", value: "adesivo", icon: "🏷️" },
    { label: "Banner", value: "banner", icon: "🖼️" },
    { label: "Outro material", value: "outro_material", icon: "💡" },
  ],
};

// keywords per material value → used to search products
const KEYWORD_MAP: Record<string, string[]> = {
  cartao: ["cartão", "cartao", "visita"],
  panfleto: ["panfleto", "flyer", "folheto"],
  folder: ["folder"],
  timbrado: ["timbrado"],
  receituario: ["receituário", "receituario"],
  banner: ["banner"],
  banner_lona: ["banner", "lona"],
  convite: ["convite"],
  adesivo: ["adesivo"],
  adesivo_grande: ["adesivo", "grande formato"],
  faixa: ["faixa"],
  placa: ["placa"],
  etiqueta: ["etiqueta"],
  rotulo: ["rótulo", "rotulo"],
  outro_material: [],
};

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  sale_price: number | null;
  short_description: string | null;
  product_images: { image_url: string; sort_order: number }[];
};

export default function AssistentePedido() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const showResults = step >= STEPS.length;

  // dynamic step 1
  const dynamicSteps = useMemo(() => {
    const s = [...STEPS];
    const need = answers[0];
    if (need && MATERIAL_MAP[need]) {
      s[1] = { ...s[1], options: MATERIAL_MAP[need] };
    } else {
      s[1] = { ...s[1], options: MATERIAL_MAP["outro"] };
    }
    return s;
  }, [answers]);

  const progress = showResults ? 100 : ((step) / STEPS.length) * 100;

  const selectOption = (value: string) => {
    const next = { ...answers, [step]: value };
    setAnswers(next);
    // if step 0 changed, reset subsequent answers
    if (step === 0) {
      delete next[1];
      delete next[2];
    }
    setStep(step + 1);
  };

  // fetch products when results shown
  useEffect(() => {
    if (!showResults) return;
    const materialValue = answers[1];
    const keywords = KEYWORD_MAP[materialValue] ?? [];
    if (!keywords.length) {
      // fallback: fetch featured
      setLoading(true);
      supabase
        .from("products")
        .select("id, name, slug, price, sale_price, short_description, product_images(image_url, sort_order)")
        .eq("is_active", true)
        .eq("is_featured", true)
        .order("sort_order")
        .limit(6)
        .then(({ data }) => { setProducts((data as any) ?? []); setLoading(false); });
      return;
    }
    setLoading(true);
    // search by name ilike any keyword
    const orFilter = keywords.map(k => `name.ilike.%${k}%`).join(",");
    supabase
      .from("products")
      .select("id, name, slug, price, sale_price, short_description, product_images(image_url, sort_order)")
      .eq("is_active", true)
      .or(orFilter)
      .order("sort_order")
      .limit(6)
      .then(({ data }) => { setProducts((data as any) ?? []); setLoading(false); });
  }, [showResults, answers]);

  const reset = () => { setStep(0); setAnswers({}); setProducts([]); };

  const currentStep = dynamicSteps[step];

  const getImage = (p: Product) => {
    const sorted = [...(p.product_images || [])].sort((a, b) => a.sort_order - b.sort_order);
    return sorted[0]?.image_url || "/placeholder.svg";
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <PublicLayout>
      {/* SEO */}
      <title>Assistente de Pedido | Gráfica ImPlotter</title>
      <meta name="description" content="Use nosso assistente interativo para encontrar o produto gráfico ideal para sua necessidade." />

      <section className="py-12 md:py-20">
        <div className="container max-w-3xl mx-auto px-4">
          {/* header */}
          <div className="text-center mb-10">
            <Badge variant="secondary" className="mb-3 gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Assistente Inteligente</Badge>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Assistente de Pedido</h1>
            <p className="text-muted-foreground mt-2">Responda algumas perguntas e encontre o produto ideal para você.</p>
          </div>

          {/* progress */}
          <Progress value={progress} className="h-2 mb-8" />

          <AnimatePresence mode="wait">
            {!showResults && currentStep ? (
              <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}>
                <Card className="border-border/60 shadow-lg">
                  <CardContent className="p-6 md:p-8">
                    <p className="text-xs text-muted-foreground mb-1">Passo {step + 1} de {STEPS.length}</p>
                    <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-6">{currentStep.question}</h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {currentStep.options.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => selectOption(opt.value)}
                          className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                            answers[step] === opt.value ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-border"
                          }`}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <span className="font-medium text-foreground">{opt.label}</span>
                        </button>
                      ))}
                    </div>

                    {step > 0 && (
                      <Button variant="ghost" className="mt-6" onClick={() => setStep(step - 1)}>
                        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : showResults ? (
              <motion.div key="results" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <Card className="border-border/60 shadow-lg">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-6">
                      <CheckCircle2 className="h-6 w-6 text-success" />
                      <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                        Com base nas suas respostas, recomendamos:
                      </h2>
                    </div>

                    {loading ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                          <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : products.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-muted-foreground mb-4">Não encontramos produtos específicos, mas podemos te ajudar!</p>
                        <div className="flex flex-wrap justify-center gap-3">
                          <Button onClick={() => navigate("/loja")}><Eye className="mr-1 h-4 w-4" /> Ver Loja</Button>
                          <Button variant="outline" onClick={() => navigate("/fale-conosco")}><FileText className="mr-1 h-4 w-4" /> Solicitar Orçamento</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map((p) => (
                          <div key={p.id} className="rounded-xl border border-border overflow-hidden bg-card hover:shadow-md transition-shadow">
                            <img src={getImage(p)} alt={p.name} className="w-full h-40 object-cover" loading="lazy" />
                            <div className="p-4">
                              <h3 className="font-semibold text-foreground line-clamp-2">{p.name}</h3>
                              {p.short_description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.short_description}</p>}
                              <p className="font-bold text-primary mt-2">
                                {p.sale_price ? (
                                  <><span className="line-through text-muted-foreground text-xs mr-1">{fmt(p.price)}</span>{fmt(p.sale_price)}</>
                                ) : fmt(p.price)}
                              </p>
                              <div className="flex gap-2 mt-3">
                                <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/loja/${p.slug}`)}>
                                  <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                                </Button>
                                <Button size="sm" className="flex-1" onClick={() => navigate(`/loja/${p.slug}`)}>
                                  <ShoppingCart className="mr-1 h-3.5 w-3.5" /> Comprar
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
                      <Button variant="outline" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Recomeçar</Button>
                      <Button variant="outline" onClick={() => navigate("/fale-conosco")}><FileText className="mr-1 h-4 w-4" /> Solicitar Orçamento</Button>
                      <Button onClick={() => navigate("/loja")}><ArrowRight className="mr-1 h-4 w-4" /> Ver Toda a Loja</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </section>
    </PublicLayout>
  );
}
