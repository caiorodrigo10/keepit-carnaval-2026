"use client";

import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {templates.map((template) => (
          <motion.div key={template.id} variants={itemVariants}>
            <Card
              className={cn(
                "overflow-hidden cursor-pointer transition-all duration-300 group rounded-2xl",
                selectedId === template.id
                  ? "border-keepit-brand shadow-[0_0_15px_rgba(52,191,88,0.3)] scale-[1.02]"
                  : "border-[rgba(0,0,0,0.03)] hover:border-keepit-brand/50 hover:shadow-md"
              )}
              onClick={() => onSelect(template)}
            >
              <div className="relative bg-muted overflow-hidden">
                <img
                  src={template.preview_url}
                  alt={template.name}
                  className="w-full h-auto object-contain group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {selectedId === template.id && (
                  <div className="absolute inset-0 bg-keepit-brand/10 border-2 border-keepit-brand rounded-t-2xl" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <h3 className="font-black text-sm text-white tracking-tight">{template.name}</h3>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
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
