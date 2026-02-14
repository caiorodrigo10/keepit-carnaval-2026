"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  Sun,
  Glasses,
  User,
  PersonStanding,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UploadableFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  url: string | null;
  error: string | null;
}

interface PhotoUploaderProps {
  file: UploadableFile | null;
  isUploading: boolean;
  uploadProgress: number;
  onSelectFile: (file: File) => void;
  onRemoveFile: () => void;
  onGenerate: () => void;
}

export function PhotoUploader({
  file,
  isUploading,
  uploadProgress,
  onSelectFile,
  onRemoveFile,
  onGenerate,
}: PhotoUploaderProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      onSelectFile(fileList[0]);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden file inputs */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* Title */}
      <div className="text-center space-y-2 py-2">
        <h2 className="text-2xl font-black tracking-tight text-keepit-dark">
          Sua Foto de Carnaval com IA
        </h2>
        <p className="text-sm text-muted-foreground">
          Envie uma foto sua e a IA vai transformar sua roupa em uma fantasia de carnaval!
        </p>
      </div>

      {/* Tips with icons */}
      <div className="card-keepit p-4">
        <h3 className="font-bold text-sm text-keepit-dark mb-3 text-center">Para melhores resultados</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <Sun className="h-4 w-4 text-amber-500" />
            </div>
            <span className="text-xs text-muted-foreground leading-tight">Boa iluminacao</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <Glasses className="h-4 w-4 text-blue-500" />
            </div>
            <span className="text-xs text-muted-foreground leading-tight">Sem oculos ou bone</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-green-500" />
            </div>
            <span className="text-xs text-muted-foreground leading-tight">Corpo inteiro ou cintura pra cima</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <PersonStanding className="h-4 w-4 text-purple-500" />
            </div>
            <span className="text-xs text-muted-foreground leading-tight">Bracos soltos, sem cruzar</span>
          </div>
        </div>
      </div>

      {/* Photo area */}
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="card-keepit border-dashed border-2 border-keepit-dark/10 p-6"
          >
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 rounded-full bg-keepit-brand/10 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-keepit-brand" />
              </div>
              <div className="text-center">
                <p className="text-keepit-dark font-black tracking-tight text-lg">Tire ou selecione uma foto</p>
                <p className="text-sm text-muted-foreground mt-1">
                  A IA vai transformar sua roupa em fantasia de carnaval
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold cursor-pointer bg-keepit-dark text-white hover:bg-black transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Tirar Foto
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-keepit-dark/10 px-4 py-3 text-sm font-semibold cursor-pointer text-keepit-dark hover:bg-keepit-dark/5 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Galeria
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative"
          >
            <div className="card-keepit overflow-hidden">
              <div className="relative">
                <img
                  src={file.preview}
                  alt="Sua foto"
                  className="w-full max-h-[400px] object-contain bg-black/5"
                />

                {/* Status overlay */}
                {(file.status === "compressing" || file.status === "uploading") && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <span className="text-white text-sm font-medium">
                      {file.status === "compressing" ? "Comprimindo..." : `Enviando... ${uploadProgress}%`}
                    </span>
                  </div>
                )}

                {/* Remove button */}
                {!isUploading && (
                  <button
                    onClick={onRemoveFile}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Change photo button */}
            {!isUploading && (
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-keepit-dark/10 px-4 py-2.5 text-sm font-medium cursor-pointer text-keepit-dark/60 hover:bg-keepit-dark/5 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Trocar foto
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.05)] p-4">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-keepit-dark text-white hover:bg-black font-semibold h-12 rounded-xl"
            disabled={!file || isUploading}
            onClick={onGenerate}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Transformar em Carnaval
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
