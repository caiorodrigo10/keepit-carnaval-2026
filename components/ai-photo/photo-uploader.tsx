"use client";

import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  Plus,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Info,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { AI_PHOTO_LIMITS } from "@/types/ai-photo";

export interface UploadableFile {
  id: string;
  file: File;
  preview: string;
  status: "pending" | "compressing" | "uploading" | "done" | "error";
  url: string | null;
  error: string | null;
}

interface PhotoUploaderProps {
  files: UploadableFile[];
  isUploading: boolean;
  uploadProgress: number;
  onAddFiles: (files: FileList) => void;
  onRemoveFile: (id: string) => void;
  onGenerate: () => void;
  onBack: () => void;
}

export function PhotoUploader({
  files,
  isUploading,
  uploadProgress,
  onAddFiles,
  onRemoveFile,
  onGenerate,
  onBack,
}: PhotoUploaderProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const minPhotos = AI_PHOTO_LIMITS.MIN_REFERENCE_PHOTOS;
  const maxPhotos = AI_PHOTO_LIMITS.MAX_REFERENCE_PHOTOS;
  const hasMinimum = files.length >= minPhotos;
  const canAddMore = files.length < maxPhotos;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      onAddFiles(fileList);
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Hidden file inputs — triggered programmatically via ref.click() for
          maximum mobile compatibility (label+htmlFor breaks on iOS Safari) */}
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
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

      {/* Tips card */}
      <div className="card-keepit p-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-keepit-brand/10 flex items-center justify-center shrink-0">
              <Info className="h-5 w-5 text-keepit-brand" />
            </div>
            <div>
              <h3 className="font-black tracking-tight text-keepit-dark mb-2">Dicas para melhores resultados</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                  <span>Quanto mais fotos suas, melhor o resultado da IA</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                  <span>Rosto visivel e bem iluminado</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                  <span>Evite oculos escuros ou mascara</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                  <span>Diferentes angulos ajudam a IA</span>
                </li>
              </ul>
            </div>
          </div>
      </div>

      {/* Photo count badge */}
      <div className="flex items-center justify-between">
        <h3 className="font-black tracking-tight text-keepit-dark">Suas fotos</h3>
        <Badge
          variant="outline"
          className={cn(
            hasMinimum
              ? "border-keepit-brand/30 text-keepit-brand"
              : "border-destructive text-destructive"
          )}
        >
          {files.length}/{maxPhotos} fotos
        </Badge>
      </div>

      {/* Photo grid */}
      {files.length === 0 ? (
        <div className="card-keepit border-dashed border-2 border-keepit-dark/10 p-6">
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-keepit-brand/10 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-keepit-brand" />
              </div>
              <div className="text-center">
                <p className="text-keepit-dark font-black tracking-tight">Adicione suas fotos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Minimo {minPhotos} foto, maximo {maxPhotos} — quanto mais, melhor!
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold cursor-pointer bg-keepit-dark text-white hover:bg-black transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  Camera
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-keepit-dark/10 px-4 py-2 text-sm font-semibold cursor-pointer text-keepit-dark hover:bg-keepit-dark/5 transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  Galeria
                </button>
              </div>
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <AnimatePresence mode="popLayout">
            {files.map((file) => (
              <motion.div
                key={file.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                layout
                className="aspect-square relative rounded-2xl overflow-hidden bg-muted"
              >
                <img
                  src={file.preview}
                  alt="Foto de referencia"
                  className="w-full h-full object-cover"
                />

                {/* Status overlay */}
                {(file.status === "compressing" || file.status === "uploading") && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
                {file.status === "done" && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-keepit-brand flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                {file.status === "error" && (
                  <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-destructive flex items-center justify-center">
                    <AlertCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                )}

                {/* Remove button */}
                {!isUploading && (
                  <button
                    onClick={() => onRemoveFile(file.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add more button */}
          {canAddMore && !isUploading && (
            <motion.button
              type="button"
              onClick={() => galleryRef.current?.click()}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="aspect-square rounded-2xl border-2 border-dashed border-keepit-dark/10 flex flex-col items-center justify-center gap-1 hover:bg-keepit-dark/5 transition-colors cursor-pointer"
            >
              <Plus className="w-6 h-6 text-keepit-dark/40" />
              <span className="text-[10px] text-keepit-dark/40">Adicionar</span>
            </motion.button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Preparando fotos...</span>
            <span className="text-foreground font-medium">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}

      {/* Fixed bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-[rgba(0,0,0,0.05)] p-4">
        <div className="max-w-lg mx-auto space-y-2">
          {files.length > 0 && canAddMore && !isUploading && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-keepit-dark/10 px-4 py-2 text-sm font-semibold cursor-pointer text-keepit-dark hover:bg-keepit-dark/5 transition-colors"
              >
                <Camera className="w-4 h-4" />
                Camera
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-md border border-keepit-dark/10 px-4 py-2 text-sm font-semibold cursor-pointer text-keepit-dark hover:bg-keepit-dark/5 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Galeria
              </button>
            </div>
          )}
          <Button
            className="w-full bg-keepit-dark text-white hover:bg-black font-semibold h-12"
            disabled={!hasMinimum || isUploading}
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
                Gerar Minha Foto
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

