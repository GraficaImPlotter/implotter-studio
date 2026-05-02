import React from "react";
import { Check, Clock, Package, Palette, Printer, Scissors, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimelineStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  statuses: string[];
}

const STEPS: TimelineStep[] = [
  {
    id: "payment",
    label: "Pagamento",
    description: "Confirmação financeira",
    icon: Clock,
    statuses: ["pedido_recebido", "aguardando_pagamento", "pagamento_confirmado"],
  },
  {
    id: "art",
    label: "Arte",
    description: "Análise técnica e prova",
    icon: Palette,
    statuses: ["em_analise", "aguardando_arte", "arte_em_conferencia"],
  },
  {
    id: "production",
    label: "Produção",
    description: "Impressão do material",
    icon: Printer,
    statuses: ["aprovado_producao", "em_producao"],
  },
  {
    id: "finishing",
    label: "Acabamento",
    description: "Corte, verniz e refile",
    icon: Scissors,
    statuses: ["em_acabamento"],
  },
  {
    id: "delivery",
    label: "Entrega",
    description: "Envio ou retirada",
    icon: Truck,
    statuses: ["pronto_envio", "finalizado"],
  },
];

export default function ProductionTimeline({ currentStatus }: { currentStatus: string }) {
  // Find current step index
  const currentStepIndex = STEPS.findIndex(step => step.statuses.includes(currentStatus));
  
  // If status is not found (e.g. canceled), we might show a different state or just the first step
  const activeIndex = currentStepIndex === -1 ? 0 : currentStepIndex;
  const isCanceled = currentStatus === "cancelado";

  return (
    <div className="w-full py-8">
      <div className="relative flex justify-between items-start max-w-4xl mx-auto px-4">
        {/* Connection Line */}
        <div className="absolute top-6 left-12 right-12 h-0.5 bg-slate-100 -z-10">
          <div 
            className="h-full bg-primary transition-all duration-1000" 
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isActive = idx === activeIndex && !isCanceled;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center text-center gap-3 relative z-10 w-1/5">
              <div 
                className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 border-4",
                  isCompleted ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" : 
                  isActive ? "bg-white border-primary text-primary shadow-xl animate-pulse" : 
                  "bg-white border-slate-100 text-slate-300"
                )}
              >
                {isCompleted ? <Check className="w-6 h-6" strokeWidth={3} /> : <Icon className="w-5 h-5" />}
              </div>
              
              <div className="space-y-1">
                <p className={cn(
                  "text-[10px] font-black uppercase tracking-widest transition-colors",
                  isCompleted || isActive ? "text-slate-900" : "text-slate-300"
                )}>
                  {step.label}
                </p>
                <p className="text-[8px] font-bold text-slate-400 hidden md:block max-w-[80px] mx-auto leading-tight">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {isCanceled && (
        <div className="mt-8 p-4 bg-destructive/5 rounded-2xl border border-destructive/10 text-center">
          <p className="text-xs font-black text-destructive uppercase tracking-widest">Pedido Cancelado</p>
        </div>
      )}
    </div>
  );
}
