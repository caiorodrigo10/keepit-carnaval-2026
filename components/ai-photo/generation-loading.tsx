"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const LOADING_MESSAGES = [
  { threshold: 0, text: "Analisando suas fotos de referencia..." },
  { threshold: 10, text: "Criando seu cenario carnavalesco..." },
  { threshold: 20, text: "Aplicando seu rosto ao modelo..." },
  { threshold: 35, text: "Gerando 3 variantes diferentes..." },
  { threshold: 50, text: "Quase la! Ultimos ajustes..." },
];

function getCurrentMessage(elapsed: number): string {
  let msg = LOADING_MESSAGES[0].text;
  for (const m of LOADING_MESSAGES) {
    if (elapsed >= m.threshold) msg = m.text;
  }
  return msg;
}

function getFakeProgress(elapsed: number): number {
  // Ease-out curve that caps at 85%
  const maxFake = 85;
  const target = 45; // seconds to reach ~85%
  const progress = maxFake * (1 - Math.exp(-elapsed / (target / 3)));
  return Math.min(maxFake, Math.round(progress));
}

interface GenerationLoadingProps {
  templateName: string;
  error: string | null;
  isComplete: boolean;
  onRetry: () => void;
  onCancel: () => void;
}

export function GenerationLoading({
  templateName,
  error,
  isComplete,
  onRetry,
  onCancel,
}: GenerationLoadingProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (error || isComplete) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [error, isComplete]);

  const progress = isComplete ? 100 : getFakeProgress(elapsed);
  const message = getCurrentMessage(elapsed);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-black tracking-tight text-keepit-dark">Erro ao gerar sua foto</h3>
          <p className="text-keepit-dark/60 mt-2 max-w-sm">{error}</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            className="bg-keepit-dark text-white hover:bg-black font-semibold"
            onClick={onRetry}
          >
            Tentar Novamente
          </Button>
          <Button variant="outline" onClick={onCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Hub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-4">
      {/* Animated sparkles icon */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-2 border-keepit-brand/20 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full bg-keepit-brand/10 flex items-center justify-center">
            <Sparkles className="w-10 h-10 text-keepit-brand" />
          </div>
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 rounded-full bg-keepit-brand/5"
        />
      </div>

      {/* Status message */}
      <div className="text-center space-y-2">
        <h3 className="text-lg font-black tracking-tight text-keepit-dark">Gerando com {templateName}</h3>
        <AnimatePresence mode="wait">
          <motion.p
            key={message}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-muted-foreground"
          >
            {message}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-xs space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{elapsed}s</span>
          <span>~30s estimado</span>
        </div>
      </div>

      {/* Fun fact */}
      <p className="text-xs text-muted-foreground/60 text-center max-w-sm">
        3 opcoes estao sendo criadas para voce escolher a melhor
      </p>
    </div>
  );
}
