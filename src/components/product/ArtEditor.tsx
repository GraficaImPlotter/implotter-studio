import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Type, Palette, Download, RotateCcw, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ArtEditorProps {
  productName: string;
  width?: number;
  height?: number;
}

const TEMPLATES = [
  { name: "Cartão Clássico", bg: "#1a1a2e", text: "#ffffff", accent: "#e94560" },
  { name: "Moderno", bg: "#ffffff", text: "#2d3436", accent: "#0984e3" },
  { name: "Elegante", bg: "#2c2c54", text: "#f5f6fa", accent: "#cd9b1d" },
  { name: "Natureza", bg: "#2d5016", text: "#ffffff", accent: "#a8e063" },
  { name: "Minimalista", bg: "#fafafa", text: "#333333", accent: "#ff6b6b" },
];

const ArtEditor = ({ productName, width = 90, height = 50 }: ArtEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [name, setName] = useState("Seu Nome");
  const [title, setTitle] = useState("Cargo / Profissão");
  const [phone, setPhone] = useState("(00) 00000-0000");
  const [email, setEmail] = useState("email@exemplo.com");
  const [template, setTemplate] = useState(TEMPLATES[0]);
  const [fontSize, setFontSize] = useState(18);
  const [align, setAlign] = useState<"left" | "center" | "right">("left");

  const CANVAS_W = 540;
  const CANVAS_H = 300;

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = template.bg;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Accent bar
    ctx.fillStyle = template.accent;
    ctx.fillRect(0, CANVAS_H - 6, CANVAS_W, 6);

    // Accent left bar
    ctx.fillRect(0, 0, 4, CANVAS_H);

    // Text alignment
    const xBase = align === "center" ? CANVAS_W / 2 : align === "right" ? CANVAS_W - 30 : 30;
    ctx.textAlign = align;

    // Name
    ctx.fillStyle = template.text;
    ctx.font = `bold ${fontSize + 4}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(name, xBase, 80);

    // Title
    ctx.fillStyle = template.accent;
    ctx.font = `${fontSize - 2}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(title, xBase, 110);

    // Divider
    ctx.strokeStyle = template.accent + "40";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 130);
    ctx.lineTo(CANVAS_W - 30, 130);
    ctx.stroke();

    // Contact info
    ctx.fillStyle = template.text + "cc";
    ctx.font = `${fontSize - 4}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`📞 ${phone}`, xBase, 165);
    ctx.fillText(`✉️ ${email}`, xBase, 190);
  };

  useEffect(() => {
    draw();
  }, [name, title, phone, email, template, fontSize, align]);

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `arte-${productName.replace(/\s/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
        <Palette className="w-5 h-5 text-highlight" /> Editor de Arte Rápido
      </h3>

      {/* Canvas preview */}
      <div className="bg-secondary/30 rounded-xl p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="rounded-lg shadow-card max-w-full"
          style={{ maxWidth: "100%", height: "auto" }}
        />
      </div>

      {/* Templates */}
      <div>
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Modelo</label>
        <div className="flex gap-2 flex-wrap">
          {TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() => setTemplate(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                template.name === t.name
                  ? "border-highlight bg-highlight/10 text-highlight"
                  : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary"
              }`}
            >
              <span className="inline-block w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: t.accent }} />
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Text inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Cargo</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Telefone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground mb-1 block">Email</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border text-sm" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-1">
          <button onClick={() => setAlign("left")} className={`p-1.5 rounded ${align === "left" ? "bg-highlight text-white" : "text-muted-foreground"}`}>
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAlign("center")} className={`p-1.5 rounded ${align === "center" ? "bg-highlight text-white" : "text-muted-foreground"}`}>
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setAlign("right")} className={`p-1.5 rounded ${align === "right" ? "bg-highlight text-white" : "text-muted-foreground"}`}>
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <Type className="w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="range"
            min={12}
            max={28}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="w-20 accent-primary"
          />
        </div>

        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setName("Seu Nome"); setTitle("Cargo / Profissão"); setPhone("(00) 00000-0000"); setEmail("email@exemplo.com"); }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </Button>
          <Button variant="highlight" size="sm" onClick={downloadImage}>
            <Download className="w-3.5 h-3.5" /> Baixar PNG
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ArtEditor;
