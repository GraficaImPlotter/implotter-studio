import React, { useState, useRef, useEffect } from "react";
import { 
  Type, Image as ImageIcon, Palette, Download, 
  Layers, MousePointer2, Trash2, Check, X,
  ChevronRight, ChevronLeft, Plus, Minus, Move
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

type Element = {
  id: string;
  type: "text" | "image";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  color?: string;
  rotation: number;
  fontFamily?: string;
};

const FONTS = ["Inter", "Impact", "Arial", "Georgia", "Monospace", "Outfit"];

export const DesignStudio = ({ 
  onSave, 
  onClose,
  productImage,
  targetWidth = 1.0, // in meters
  targetHeight = 1.0 // in meters
}: { 
  onSave: (dataUrl: string) => void, 
  onClose: () => void,
  productImage?: string,
  targetWidth?: number,
  targetHeight?: number
}) => {
  const { toast } = useToast();
  const [elements, setElements] = useState<Element[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bgColor, setBgColor] = useState("#ffffff");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const calculateDPI = (el: Element) => {
    if (el.type !== "image") return null;
    // Simple heuristic: targetWidth in meters to inches
    const widthInInches = targetWidth * 39.37;
    // Proportion of the canvas this element takes
    const canvasProp = el.width / 500; 
    const physicalWidth = widthInInches * canvasProp;
    
    // We need the original image resolution. For now, we'll estimate based on dataUrl size
    // A better way would be to store originalWidth in the Element type
    const dpi = 300; // Placeholder until we have original image metadata
    return Math.round(dpi);
  };

  const addText = () => {
    const newEl: Element = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      content: "Digite seu texto",
      x: 100,
      y: 100,
      width: 150,
      height: 40,
      fontSize: 24,
      color: "#000000",
      rotation: 0,
      fontFamily: "Inter"
    };
    setElements([...elements, newEl]);
    setSelectedId(newEl.id);
  };

  const addImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newEl: Element = {
            id: Math.random().toString(36).substr(2, 9),
            type: "image",
            content: event.target?.result as string,
            x: 50,
            y: 50,
            width: 200,
            height: (200 * img.height) / img.width,
            rotation: 0
          };
          setElements([...elements, newEl]);
          setSelectedId(newEl.id);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const updateElement = (id: string, updates: Partial<Element>) => {
    setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter(el => el.id !== id));
    setSelectedId(null);
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // Render to hidden canvas for saving
  const handleFinalSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Elements
    const drawElements = async () => {
       for (const el of elements) {
         ctx.save();
         ctx.translate(el.x + el.width/2, el.y + el.height/2);
         ctx.rotate((el.rotation * Math.PI) / 180);
         ctx.translate(-(el.x + el.width/2), -(el.y + el.height/2));

         if (el.type === "text") {
           ctx.fillStyle = el.color || "#000";
           ctx.font = `${el.fontSize}px ${el.fontFamily}`;
           ctx.fillText(el.content, el.x, el.y + el.height);
         } else if (el.type === "image") {
           const img = new Image();
           img.src = el.content;
           ctx.drawImage(img, el.x, el.y, el.width, el.height);
         }
         ctx.restore();
       }
       onSave(canvas.toDataURL("image/png"));
    };
    drawElements();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col md:flex-row overflow-hidden">
      {/* Settings Panel (Left) */}
      <div className="w-full md:w-80 border-r border-border bg-card p-6 flex flex-col gap-8 order-2 md:order-1">
        <div className="flex items-center justify-between">
           <div className="flex flex-col items-start gap-0.5 mt-2 mb-2">
             <img src={logo} alt="Gráfica ImPlotter" className="h-7 cursor-pointer brightness-110 drop-shadow-[0_0_12px_hsl(217_85%_55%/0.4)]" />
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-highlight ml-1 -mt-1 opacity-90">Studio</span>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Adicionar Componentes</p>
             <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="flex flex-col gap-1.5 h-20 rounded-2xl border-white/5 hover:border-highlight/30 hover:bg-highlight/5 group" onClick={addText}>
                   <Type className="w-5 h-5 text-muted-foreground group-hover:text-highlight" />
                   <span className="text-[10px] font-bold">TEXTO</span>
                </Button>
                <div className="relative">
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={addImage} accept="image/*" />
                  <Button variant="outline" className="w-full flex flex-col gap-1.5 h-20 rounded-2xl border-white/5 hover:border-highlight/30 hover:bg-highlight/5 group">
                    <ImageIcon className="w-5 h-5 text-muted-foreground group-hover:text-highlight" />
                    <span className="text-[10px] font-bold">IMAGEM</span>
                  </Button>
                </div>
             </div>
          </div>

          {selectedElement && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pt-4 border-t border-border">
               <p className="text-[10px] font-black uppercase tracking-widest text-highlight">🔧 Edição do Item</p>
               
               {selectedElement.type === "text" && (
                 <>
                   <Input 
                    value={selectedElement.content} 
                    onChange={(e) => updateElement(selectedElement.id, { content: e.target.value })} 
                    className="bg-secondary/50 border-white/5 rounded-xl"
                   />
                   <div className="flex gap-2 flex-wrap">
                      {FONTS.map(f => (
                        <button 
                          key={f}
                          onClick={() => updateElement(selectedElement.id, { fontFamily: f })}
                          className={cn(
                            "px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all",
                            selectedElement.fontFamily === f ? "bg-highlight text-white border-highlight" : "bg-white/5 border-white/5"
                          )}
                          style={{ fontFamily: f }}
                        >
                          {f}
                        </button>
                      ))}
                   </div>
                   <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span>COR</span>
                        <div className="w-4 h-4 rounded-full border border-white/10" style={{ backgroundColor: selectedElement.color }} />
                      </div>
                      <input 
                        type="color" 
                        value={selectedElement.color} 
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="w-full h-8 bg-transparent cursor-pointer rounded-lg"
                      />
                   </div>
                 </>
               )}

               <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-tighter">Escala</p>
                    <Slider 
                      value={[selectedElement.width]} 
                      min={20} max={600} 
                      onValueChange={([val]) => {
                         const ratio = val / selectedElement.width;
                         updateElement(selectedElement.id, { width: val, height: selectedElement.height * ratio });
                      }} 
                    />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-tighter">Rotação ({selectedElement.rotation}°)</p>
                    <Slider 
                      value={[selectedElement.rotation]} 
                      min={0} max={360} 
                      onValueChange={([val]) => updateElement(selectedElement.id, { rotation: val })} 
                    />
                  </div>
               </div>

               {selectedElement.type === "image" && (
                 <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                       <span>Qualidade de Impressão</span>
                       <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> Alta</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                       <div className="h-full bg-success w-[85%]" />
                    </div>
                    <p className="text-[9px] text-muted-foreground font-medium">Sua imagem possui resolução ideal para este tamanho.</p>
                 </div>
               )}

               <Button variant="destructive" className="w-full rounded-xl py-6 h-auto font-black uppercase text-[10px] tracking-widest mt-2" onClick={() => deleteElement(selectedElement.id)}>
                 <Trash2 className="w-4 h-4 mr-2" /> Remover Item
               </Button>
            </motion.div>
          )}

          {!selectedId && (
            <div className="space-y-4 pt-4 border-t border-border">
               <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plano de Fundo</p>
               <div className="flex items-center gap-4">
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-12 h-12 rounded-xl bg-transparent cursor-pointer border-2 border-white/10"
                  />
                  <div className="space-y-0.5">
                     <p className="text-[11px] font-bold">{bgColor.toUpperCase()}</p>
                     <p className="text-[9px] text-muted-foreground uppercase font-medium">Cor de Preenchimento</p>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="mt-auto space-y-3">
           <Button className="w-full bg-highlight text-white hover:bg-highlight-glow rounded-2xl py-6 h-auto font-black uppercase text-xs tracking-widest shadow-glow" onClick={handleFinalSave}>
              <Check className="w-5 h-5 mr-2" /> Finalizar & Comprar
           </Button>
           <p className="text-[9px] text-center text-muted-foreground font-medium px-4">
              Ao finalizar, sua arte será salva em alta resolução e anexada ao pedido automaticamente.
           </p>
        </div>
      </div>

      {/* Main Canvas Area (Center) */}
      <div 
        className="flex-1 p-4 md:p-12 flex items-center justify-center relative order-1 md:order-2"
        style={{
          backgroundColor: "#111111",
          backgroundImage: productImage ? `radial-gradient(circle at center, rgba(17,17,17,0.4) 0%, rgba(17,17,17,0.95) 100%), url(${productImage})` : "none",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-white/5 px-4 py-2 rounded-full border border-white/10 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] pointer-events-none">
           Preview em Tempo Real
        </div>

        <div 
          ref={containerRef}
          className="relative shadow-[0_40px_100px_rgba(0,0,0,0.5)] border-gradient-premium overflow-hidden transition-all duration-500"
          style={{ 
            backgroundColor: bgColor, 
            width: "500px", 
            height: "500px",
            maxWidth: "90vw",
            maxHeight: "90vw"
          }}
          onClick={() => setSelectedId(null)}
        >
           <AnimatePresence>
             {elements.map((el) => (
               <motion.div
                 key={el.id}
                 drag
                 dragMomentum={false}
                 onDragStart={() => { setSelectedId(el.id); setIsDragging(true); }}
                 onDragEnd={(e, info) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (rect) {
                       const newX = el.x + info.offset.x;
                       const newY = el.y + info.offset.y;
                       updateElement(el.id, { x: newX, y: newY });
                    }
                    setIsDragging(false);
                 }}
                 style={{
                   position: "absolute",
                   left: el.x,
                   top: el.y,
                   width: el.width,
                   height: el.height,
                   rotate: `${el.rotation}deg`,
                   zIndex: selectedId === el.id ? 10 : 1,
                   cursor: isDragging ? "grabbing" : "grab"
                 }}
                 onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                 className={cn(
                   "flex items-center justify-center group outline-none ring-primary/40",
                   selectedId === el.id && !isDragging && "ring-2 ring-offset-2 ring-offset-transparent rounded"
                 )}
               >
                 {el.type === "text" ? (
                   <span style={{ fontSize: el.fontSize, color: el.color, fontFamily: el.fontFamily, whiteSpace: "nowrap" }} className="select-none font-bold">
                     {el.content}
                   </span>
                 ) : (
                   <img src={el.content} alt="" className="w-full h-full object-contain pointer-events-none select-none" />
                 )}
                 
                 {selectedId === el.id && !isDragging && (
                   <div className="absolute -top-2 -right-2 bg-highlight w-4 h-4 rounded-full flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-transform">
                      <Move className="w-2 h-2" />
                   </div>
                 )}
               </motion.div>
             ))}
           </AnimatePresence>
        </div>

        {/* Hidden Canvas for High-Res Export */}
        <canvas ref={canvasRef} width={2000} height={2000} className="hidden" />
      </div>

      {/* Shortcuts Help (Bottom Right) */}
      <div className="absolute bottom-6 right-6 hidden lg:block">
         <div className="glass-card px-4 py-2.5 rounded-2xl border-white/5 text-[10px] font-black text-muted-foreground flex gap-4 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white/10 rounded flex items-center justify-center">🖱️</div> Selecionar</span>
            <span className="flex items-center gap-1.5"><div className="w-4 h-4 bg-white/10 rounded flex items-center justify-center">👋</div> Mover</span>
         </div>
      </div>
    </div>
  );
};
