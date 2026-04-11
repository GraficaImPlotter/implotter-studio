import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import PublicLayout from "@/components/layout/PublicLayout";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Scale, Stethoscope, HeartPulse, Calculator, Building2, UserCircle, ShoppingBag } from "lucide-react";
import Loja from "@/pages/Loja";

const segmentData: Record<string, any> = {
  "advocacia": {
    title: "Gráfica para Advogados",
    description: "Materiais premium para transmitir credibilidade e profissionalismo na advocacia.",
    icon: Scale,
    image: "/images/segment-law.jpg",
    keywords: ["cartao premium", "pasta", "papel timbrado", "envelope"]
  },
  "clinicas": {
    title: "Gráfica para Clínicas & Médicos",
    description: "Tudo o que sua clínica precisa: desde receituários até sinalização interna.",
    icon: Stethoscope,
    image: "/images/segment-health.jpg",
    keywords: ["receituario", "pasta", "cartao retorno", "bloco"]
  },
  "dentistas": {
    title: "Gráfica para Dentistas",
    description: "Valorize seu consultório com materiais personalizados de alta qualidade.",
    icon: HeartPulse,
    image: "/images/segment-dental.jpg",
    keywords: ["anamnese", "cartao", "adesivo", "pasta"]
  },
  "contabilidade": {
    title: "Gráfica para Contabilidade",
    description: "Soluções práticas e elegantes para escritórios de contabilidade.",
    icon: Calculator,
    image: "/images/segment-accounting.jpg",
    keywords: ["envelope", "folheto", "cartao", "timbrado"]
  },
  "empresarial": {
    title: "Soluções para Empresas",
    description: "Comunicação visual e papelaria corporativa para fortalecer sua marca.",
    icon: Building2,
    image: "/images/segment-corporate.jpg",
    keywords: ["banner", "adesivo", "brinde", "placa"]
  },
  "autonomos": {
    title: "Gráfica para Profissionais Autônomos",
    description: "Pequenos detalhes que fazem grande diferença na percepção do seu cliente.",
    icon: UserCircle,
    image: "/images/segment-freelance.jpg",
    keywords: ["lacre", "tag", "cartao", "adesivo"]
  }
};

const SegmentoLoja = () => {
  const { slug } = useParams<{ slug: string }>();
  const segment = slug ? segmentData[slug] : null;

  if (!segment) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-32 text-center">
          <h2 className="text-3xl font-black mb-8">Segmento não encontrado</h2>
          <Button asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Voltar para Home</Link>
          </Button>
        </div>
      </PublicLayout>
    );
  }

  const Icon = segment.icon;

  return (
    <PublicLayout>
      <SEOHead 
        title={`${segment.title} | Gráfica ImPlotter`}
        description={segment.description}
      />
      
      {/* Hero do Segmento */}
      <section className="relative pt-[160px] pb-24 overflow-hidden bg-[#111827]">
        <div className="absolute inset-0 z-0">
          <img 
            src={segment.image} 
            alt={segment.title} 
            className="w-full h-full object-cover opacity-40 blur-[2px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/60 to-transparent" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <Link to="/" className="inline-flex items-center text-white/60 hover:text-white mb-8 transition-colors group">
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            Voltar para a Home
          </Link>

          <div className="max-w-3xl">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-6 shadow-2xl shadow-secondary/20 animate-in zoom-in duration-500">
              <Icon className="w-8 h-8 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter leading-tight animate-in fade-in slide-in-from-left duration-700 delay-200">
              {segment.title}
            </h1>
            
            <p className="text-xl text-white/70 font-medium mb-8 leading-relaxed animate-in fade-in slide-in-from-left duration-700 delay-300">
              {segment.description}
            </p>

            <div className="flex flex-wrap gap-3 animate-in fade-in slide-in-from-left duration-700 delay-400">
              <span className="text-white/40 text-sm font-bold uppercase tracking-widest block w-full mb-2">Principais soluções recomendadas:</span>
              {segment.keywords.map((kw: string) => (
                <span key={kw} className="bg-white/10 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-white/10 capitalize">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Listagem de produtos (Reutilizando o componente da Loja) */}
      <div className="bg-white">
          <Loja hideHero={true} forceSearch={segment.keywords[0]} segmentTitle="Produtos Sugeridos" />
      </div>

    </PublicLayout>
  );
};

export default SegmentoLoja;
