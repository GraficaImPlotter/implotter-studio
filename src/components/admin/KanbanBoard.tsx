import React, { useState } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface KanbanColumn {
  id: string;
  title: string;
  icon: React.ElementType;
  className?: string;
  statusKeys: string[];
}

interface KanbanBoardProps<T> {
  columns: KanbanColumn[];
  items: T[];
  renderCard: (item: T) => React.ReactNode;
  onMove: (itemId: string, newStatus: string) => Promise<void>;
  getItemStatus: (item: T) => string;
  getItemId: (item: T) => string;
  isLoading?: boolean;
}

export function KanbanBoard<T>({
  columns,
  items,
  renderCard,
  onMove,
  getItemStatus,
  getItemId,
  isLoading
}: KanbanBoardProps<T>) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleMove = async (itemId: string, newStatus: string) => {
    try {
      await onMove(itemId, newStatus);
      toast({ title: "Atualizado com sucesso" });
    } catch (err: any) {
      toast({ title: "Erro ao atualizar", description: err.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin">
        {columns.map((col) => (
          <div key={col.id} className="w-[320px] shrink-0 space-y-4">
             <div className="h-10 w-full bg-secondary/50 rounded-xl animate-pulse" />
             <div className="h-[400px] w-full bg-secondary/20 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-white/5 scroll-smooth">
      {columns.map((column) => {
        const columnItems = items.filter(item => column.statusKeys.includes(getItemStatus(item)));
        
        return (
          <div 
            key={column.id} 
            className="w-[320px] shrink-0 flex flex-col group/column"
          >
            {/* Column Header */}
            <div className={cn(
               "flex items-center gap-2.5 px-4 py-3 rounded-2xl border mb-4 font-bold text-xs uppercase tracking-widest transition-all",
               column.className || "bg-card border-border/50 text-muted-foreground"
            )}>
              <column.icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{column.title}</span>
              <div className="ml-auto bg-white/10 rounded-lg px-2 py-0.5 text-[10px] font-black">
                {columnItems.length}
              </div>
            </div>

            {/* Column Drop Area */}
            <div className="flex-1 min-h-[500px] rounded-[32px] bg-secondary/10 border border-dashed border-border/30 p-3 space-y-3 transition-colors hover:bg-secondary/20">
              <AnimatePresence initial={false}>
                {columnItems.map((item) => (
                  <motion.div
                    key={getItemId(item)}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                    whileHover={{ y: -4, rotate: 1 }}
                    whileTap={{ scale: 0.98 }}
                    className="relative cursor-grab active:cursor-grabbing"
                  >
                    {renderCard(item)}
                    
                    {/* Quick Move Overlay for Desktop (optional/mobile) */}
                    {/* Here we can add small arrows to move between columns if drag fails */}
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {columnItems.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center opacity-20 pointer-events-none">
                  <column.icon className="w-10 h-10 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Vazio</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
