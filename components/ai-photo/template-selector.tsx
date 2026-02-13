"use client";

import { motion } from "framer-motion";
import { AlertCircle, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { TemplatesResponse } from "@/types/ai-photo";

type TemplateInfo = TemplatesResponse["templates"][number];

interface TemplateSelectorProps {
  templates: TemplateInfo[];
  isLoading: boolean;
  error: string | null;
  selectedId: string | null;
  onSelect: (template: TemplateInfo) => void;
  onContinue: () => void;
  onRetry: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.2, 0.8, 0.2, 1] as [number, number, number, number] },
  },
};

export function TemplateSelector({
  templates,
  isLoading,
  error,
  selectedId,
  onSelect,
  onContinue,
  onRetry,
}: TemplateSelectorProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black tracking-tight text-keepit-dark">Erro ao carregar</h3>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
        <Button
          className="bg-keepit-dark text-white hover:bg-black font-semibold"
          onClick={onRetry}
        >
          Tentar Novamente
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/2] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      <p className="text-sm text-muted-foreground">
        Escolha um modelo para sua foto com IA
      </p>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 gap-4"
      >
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          return (
            <motion.div
              key={template.id}
              variants={itemVariants}
              className={cn(
                "relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 group",
                isSelected
                  ? "ring-3 ring-keepit-dark shadow-lg"
                  : "ring-1 ring-black/5 hover:ring-black/15 hover:shadow-md"
              )}
              onClick={() => onSelect(template)}
            >
              <div className="relative aspect-[16/10] bg-muted">
                <img
                  src={template.preview_url}
                  alt={template.name}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-12">
                  <h3 className="font-black text-white tracking-tight">{template.name}</h3>
                </div>
                {isSelected && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-keepit-dark flex items-center justify-center shadow-md">
                    <Check className="w-4 h-4 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.05)] p-4">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-keepit-dark text-white hover:bg-black font-semibold h-12"
            disabled={!selectedId}
            onClick={onContinue}
          >
            {selectedId ? "Continuar" : "Selecione um modelo"}
          </Button>
        </div>
      </div>
    </div>
  );
}
