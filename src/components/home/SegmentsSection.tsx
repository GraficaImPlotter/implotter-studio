import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Briefcase, HeartPulse, Stethoscope, Scale, Calculator, Building2, UserCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const segments = [
  {
    title: "Advogados",
    icon: Scale,
    image: "/images/segment-law.jpg",
    slug: "advocacia",
    products: ["Cartões Premium", "Pastas", "Timbrados"]
  },
  {
    title: "Clínicas & Médicos",
    icon: Stethoscope,
    image: "/images/segment-health.jpg",
    slug: "clinicas",
    products: ["Receituários", "Pastas", "Cartão Retorno"]
  },
  {
    title: "Dentistas",
    icon: HeartPulse,
    image: "/images/segment-dental.jpg",
    slug: "dentistas",
    products: ["Fichas Anamnese", "Cartões de Visita", "Adesivos"]
  },
  {
    title: "Contadores",
    icon: Calculator,
    image: "/images/segment-accounting.jpg",
    slug: "contabilidade",
    products: ["Envelopes", "Folhetos", "Brindes"]
  },
  {
    title: "Empresas",
    icon: Building2,
    image: "/images/segment-corporate.jpg",
    slug: "empresarial",
    products: ["Banners", "Sinalização", "Papelaria"]
  },
  {
    title: "Autônomos",
    icon: UserCircle,
    image: "/images/segment-freelance.jpg",
    slug: "autonomos",
    products: ["Adesivos Lacre", "Cartões", "Tags"]
  }
];

const SegmentsSection = () => {
  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
          <div className="max-w-2xl">
            <span className="text-secondary font-black uppercase tracking-widest text-[11px] mb-4 block">Especialistas por área</span>
            <h2 className="text-3xl md:text-5xl font-black text-[#111827] leading-tight mb-4 tracking-tighter">
              Soluções personalizadas para o <span className="text-secondary">seu segmento</span>
            </h2>
            <p className="text-gray-500 text-lg font-medium">
              Desenvolvemos materiais específicos que atendem às normas e exigências da sua profissão.
            </p>
          </div>
          <Link to="/loja">
            <Button className="h-14 px-8 bg-[#111827] hover:bg-[#111827]/90 text-white rounded-2xl font-black uppercase text-xs tracking-widest active:scale-95 transition-all">
              Ver Catálogo Completo
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {segments.map((item, i) => (
            <motion.div
              key={item.slug}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              viewport={{ once: true }}
              className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-[#111827]/40 to-transparent z-10" />
              <img 
                src={item.image} 
                alt={item.title} 
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
              />
              
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="w-12 h-12 rounded-xl bg-secondary/90 backdrop-blur-md flex items-center justify-center mb-4 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="text-2xl font-black text-white mb-2 tracking-tight group-hover:text-secondary transition-colors">{item.title}</h3>
                <p className="text-white/70 text-sm font-medium mb-6 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                  {item.products.join(" • ")}
                </p>
                
                <Link to={`/loja?segmento=${item.slug}`}>
                  <Button variant="outline" className="w-full h-12 rounded-xl bg-white/10 hover:bg-white border-white/20 hover:border-white text-white hover:text-[#111827] font-black uppercase text-[10px] tracking-widest transition-all duration-300">
                    Explorar Soluções <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SegmentsSection;
