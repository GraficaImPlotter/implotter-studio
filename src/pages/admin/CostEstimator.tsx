import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { 
  Calculator, DollarSign, Percent, TrendingUp, 
  Layers, Paintbrush, Clock, Save, Info 
} from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export default function CostEstimator() {
  const [costs, setCosts] = useState({
    material: 0,
    ink: 0,
    labor: 0,
    markup: 100, // 100% markup default
    overhead: 10 // 10% overhead
  });

  const [results, setResults] = useState({
    totalCost: 0,
    sellingPrice: 0,
    profit: 0,
    margin: 0
  });

  useEffect(() => {
    const rawCost = costs.material + costs.ink + costs.labor;
    const totalCost = rawCost * (1 + costs.overhead / 100);
    const profit = totalCost * (costs.markup / 100);
    const sellingPrice = totalCost + profit;
    const margin = (profit / sellingPrice) * 100;

    setResults({
      totalCost,
      sellingPrice,
      profit,
      margin
    });
  }, [costs]);

  return (
    <AdminLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center border border-success/20 text-success shadow-glow-sm">
            <Calculator className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-black text-foreground tracking-tight uppercase">Engenharia de <span className="text-success">Preços</span></h1>
            <p className="text-muted-foreground text-sm font-medium">Calcule custos e garanta sua lucratividade</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Inputs Section */}
          <div className="space-y-6 glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl">
            <h3 className="text-lg font-black text-foreground uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-success" /> Insumos & Base
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Matéria-Prima (R$)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      className="pl-10 h-12 bg-white/5 border-white/5 rounded-xl font-bold" 
                      value={costs.material || ""} 
                      onChange={(e) => setCosts({...costs, material: Number(e.target.value)})}
                    />
                  </div>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Tinta / Impressão (R$)</Label>
                  <div className="relative">
                    <Paintbrush className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      className="pl-10 h-12 bg-white/5 border-white/5 rounded-xl font-bold" 
                      value={costs.ink || ""}
                      onChange={(e) => setCosts({...costs, ink: Number(e.target.value)})}
                    />
                  </div>
               </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Mão de Obra / Acabamento (R$)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  className="pl-10 h-12 bg-white/5 border-white/5 rounded-xl font-bold" 
                  value={costs.labor || ""}
                  onChange={(e) => setCosts({...costs, labor: Number(e.target.value)})}
                />
              </div>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Markup Desejado</Label>
                    <span className="text-xl font-black text-success">{costs.markup}%</span>
                  </div>
                  <Slider 
                    value={[costs.markup]} 
                    onValueChange={([v]) => setCosts({...costs, markup: v})}
                    max={500} 
                    step={5} 
                    className="py-4"
                  />
               </div>

               <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest opacity-60">Custos Fixos / Impostos</Label>
                    <span className="text-xl font-black text-muted-foreground">{costs.overhead}%</span>
                  </div>
                  <Slider 
                    value={[costs.overhead]} 
                    onValueChange={([v]) => setCosts({...costs, overhead: v})}
                    max={50} 
                    step={1} 
                    className="py-4"
                  />
               </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="space-y-6 flex flex-col justify-between">
             <div className="glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl bg-gradient-to-br from-success/10 to-transparent">
                <p className="text-[10px] font-black uppercase tracking-widest text-success mb-2">Preço de Venda Sugerido</p>
                <h2 className="text-7xl font-black text-foreground tracking-tighter mb-8 leading-none">
                  R$ {results.sellingPrice.toFixed(2)}
                </h2>

                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Custo Total</p>
                      <p className="text-xl font-black text-foreground">R$ {results.totalCost.toFixed(2)}</p>
                   </div>
                   <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Lucro Bruto</p>
                      <p className="text-xl font-black text-success">R$ {results.profit.toFixed(2)}</p>
                   </div>
                </div>
             </div>

             <div className="glass-card-premium p-8 rounded-[40px] border-white/5 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center gap-2">
                      <Percent className="w-5 h-5 text-highlight" />
                      <h4 className="text-lg font-black uppercase tracking-tight">Margem de Lucro</h4>
                   </div>
                   <div className="px-6 py-2 rounded-full bg-highlight/10 border border-highlight/20">
                      <span className="text-xl font-black text-highlight">{results.margin.toFixed(1)}%</span>
                   </div>
                </div>
                
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground bg-white/5 p-4 rounded-2xl italic">
                   <Info className="w-4 h-4 shrink-0" />
                   Esta simulação considera o markup sobre o custo total (incluindo impostos e custos fixos).
                </div>
             </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
