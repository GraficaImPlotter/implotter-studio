import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, MousePointer2 } from "lucide-react";

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
  title: string;
  subtitle: string;
}

export const BeforeAfterSlider = ({ beforeImage, afterImage, title, subtitle }: BeforeAfterProps) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  };

  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);

  return (
    <div className="py-20 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row items-center justify-between gap-12 mb-16">
           <div className="max-w-xl">
              <div className="flex items-center gap-2 text-primary font-black uppercase text-[10px] tracking-[0.3em] mb-4">
                 <div className="w-8 h-px bg-primary" /> Resultados Reais
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-black text-slate-900 tracking-tighter leading-none mb-6">
                {title}
              </h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed">
                {subtitle} Arraste o slider para ver a diferença.
              </p>
           </div>
           
           <div className="hidden md:flex flex-col items-end text-right">
              <p className="text-3xl font-display font-black text-slate-900 leading-none">98%</p>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Satisfação dos Clientes</p>
           </div>
        </div>

        <div 
          ref={containerRef}
          className="relative aspect-[16/9] md:aspect-[21/9] rounded-[3rem] overflow-hidden shadow-2xl cursor-ew-resize group select-none border-8 border-slate-100"
          onMouseMove={onMouseMove}
          onTouchMove={onTouchMove}
        >
          {/* After Image (Full background) */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${afterImage})` }}
          />
          
          {/* Before Image (Clipped) */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-none"
            style={{ 
              backgroundImage: `url(${beforeImage})`,
              clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`
            }}
          />

          {/* Slider Line */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_20px_rgba(0,0,0,0.3)] z-10 transition-none"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-slate-100 group-active:scale-90 transition-transform">
               <div className="flex items-center gap-1 text-slate-900">
                  <ChevronLeft className="w-4 h-4" />
                  <ChevronRight className="w-4 h-4" />
               </div>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-8 left-8 z-20 pointer-events-none">
             <span className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                Antes
             </span>
          </div>
          <div className="absolute top-8 right-8 z-20 pointer-events-none">
             <span className="px-4 py-2 bg-primary/80 backdrop-blur-md rounded-full text-white text-[10px] font-black uppercase tracking-widest">
                Depois da ImPlotter
             </span>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm px-6 py-3 rounded-2xl flex items-center gap-2 text-slate-900">
             <MousePointer2 className="w-4 h-4 animate-bounce" />
             <span className="text-[10px] font-black uppercase tracking-widest">Arraste para comparar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
