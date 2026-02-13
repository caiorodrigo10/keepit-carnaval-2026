"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  Download,
  Share2,
  Sparkles,
  ArrowLeft,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VariantInfo } from "@/types/ai-photo";

interface ResultGalleryProps {
  variants: VariantInfo[];
  templateName: string;
  remainingGenerations: number;
  onGenerateAnother: () => void;
  onRegenerate: () => void;
  onBackToHub: () => void;
}

export function ResultGallery({
  variants,
  templateName,
  remainingGenerations,
  onGenerateAnother,
  onRegenerate,
  onBackToHub,
}: ResultGalleryProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const variant = variants[0];
  const isSuccess = variant?.status === "completed" && variant?.url;

  async function handleDownload(url: string) {
    setIsDownloading(true);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `keepit-ai-carnaval.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleShare(url: string) {
    const text = `Minha foto com IA no Carnaval Keepit 2026!`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Keepit Carnaval AI", text, url });
        return;
      } catch {
        // User cancelled or share failed
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Ignore
    }
  }

  return (
    <div className="space-y-6 pb-32">
      {/* Success header */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-keepit-brand/20 flex items-center justify-center"
        >
          <CheckCircle2 className="w-8 h-8 text-keepit-brand" />
        </motion.div>
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight text-keepit-dark">
            {isSuccess ? "Sua foto ficou incrivel!" : "Geracao concluida"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Modelo: {templateName}
          </p>
        </div>
      </div>

      {/* Single photo */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="rounded-2xl overflow-hidden border border-[rgba(0,0,0,0.03)] shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
        >
          <div className="aspect-square relative bg-muted">
            <img
              src={variant.url!}
              alt={`Foto IA - ${templateName}`}
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>
      )}

      {/* Action buttons under photo */}
      {isSuccess && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <Button
            className="flex-1 bg-keepit-dark text-white hover:bg-black font-semibold h-12"
            disabled={isDownloading}
            onClick={() => handleDownload(variant.url!)}
          >
            {isDownloading ? (
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Download className="w-5 h-5 mr-2" />
            )}
            Baixar
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-keepit-dark/10 text-keepit-dark hover:bg-keepit-dark/5 h-12"
            onClick={() => handleShare(variant.url!)}
          >
            <Share2 className="w-5 h-5 mr-2" />
            Compartilhar
          </Button>
        </motion.div>
      )}

      {/* Bottom actions */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.05)] p-4">
        <div className="max-w-lg mx-auto space-y-2">
          {remainingGenerations > 0 && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-keepit-dark/10 text-keepit-dark hover:bg-keepit-dark/5 h-12"
                onClick={onGenerateAnother}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Outro modelo
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-keepit-dark/10 text-keepit-dark hover:bg-keepit-dark/5 h-12"
                onClick={onRegenerate}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerar
              </Button>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full h-12"
            onClick={onBackToHub}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Voltar ao Hub
          </Button>
        </div>
      </div>
    </div>
  );
}
