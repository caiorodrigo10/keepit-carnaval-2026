"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  compressImage,
  fullSizeCompressionOptions,
  validateImageFile,
} from "@/lib/image-compression";
import {
  AI_PHOTO_LIMITS,
  type VariantInfo,
  type AiPhotoErrorResponse,
} from "@/types/ai-photo";
import { getStoredLead, type StoredLead } from "@/lib/lead-storage";
import { WizardHeader } from "@/components/ai-photo/wizard-header";
import {
  PhotoUploader,
  type UploadableFile,
} from "@/components/ai-photo/photo-uploader";
import { GenerationLoading } from "@/components/ai-photo/generation-loading";
import { ResultGallery } from "@/components/ai-photo/result-gallery";
import type { WizardStep } from "@/components/ai-photo/wizard-stepper";

interface AiPhotoWizardProps {
  lead: StoredLead;
}

export function AiPhotoWizard({ lead }: AiPhotoWizardProps) {
  const router = useRouter();

  // Step state — v2: upload → generating → results (no template step)
  const [step, setStep] = useState<WizardStep>("upload");

  // Single file
  const [file, setFile] = useState<UploadableFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Generation — use ref + counter to guarantee re-render
  const generationErrorRef = useRef<string | null>(null);
  const generationResultRef = useRef<{ variants: VariantInfo[]; isComplete: boolean } | null>(null);
  const [genTick, setGenTick] = useState(0);

  // Derived values from refs
  const generationError = generationErrorRef.current;
  const isComplete = generationResultRef.current?.isComplete ?? false;

  const setGenerationError = useCallback((error: string | null) => {
    generationErrorRef.current = error;
    setGenTick((t) => t + 1);
  }, []);
  const setGenerationResult = useCallback((variants: VariantInfo[], isComplete: boolean) => {
    generationResultRef.current = { variants, isComplete };
    setGenTick((t) => t + 1);
  }, []);

  // Results (derived from ref)
  const variants = generationResultRef.current?.variants ?? [];

  // Remaining generations
  const [remainingGenerations, setRemainingGenerations] = useState<number>(
    AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD
  );

  useEffect(() => {
    checkGenerationLimit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkGenerationLimit() {
    try {
      const supabase = createClient();
      const { count } = await supabase
        .from("ai_photo_generations")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", lead.id)
        .neq("status", "failed");
      const used = count || 0;
      setRemainingGenerations(
        Math.max(0, AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD - used)
      );
    } catch {
      // Default to max
    }
  }

  // File selection
  const handleSelectFile = useCallback((newFile: File) => {
    const error = validateImageFile(newFile);
    if (error) {
      toast.error(error);
      return;
    }

    // Revoke previous preview URL
    setFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });

    setFile({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file: newFile,
      preview: URL.createObjectURL(newFile),
      status: "pending",
      url: null,
      error: null,
    });
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
  }, []);

  // Generate
  const handleGenerate = useCallback(async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    const supabase = createClient();

    try {
      // Compress
      setFile((prev) => prev ? { ...prev, status: "compressing" } : prev);
      setUploadProgress(20);

      const compressed = await compressImage(file.file, fullSizeCompressionOptions);

      // Upload
      setFile((prev) => prev ? { ...prev, status: "uploading" } : prev);
      setUploadProgress(50);

      const timestamp = Date.now();
      const path = `references/${lead.id}/${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("ai-photos")
        .upload(path, compressed, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro ao enviar foto: ${uploadError.message}`);
      }

      const { data: urlData } = supabase.storage
        .from("ai-photos")
        .getPublicUrl(path);

      const photoUrl = urlData.publicUrl;

      setFile((prev) => prev ? { ...prev, status: "done", url: photoUrl } : prev);
      setUploadProgress(90);

      // Transition to generating
      setIsUploading(false);
      setStep("generating");
      setGenerationError(null);
      generationResultRef.current = null;
      setGenTick((t) => t + 1);

      // Call generate API — v2: single photo, no template
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch("/api/ai-photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          photo_url: photoUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData: AiPhotoErrorResponse = await res.json().catch(() => ({
          success: false as const,
          error: "Erro desconhecido",
          code: "INTERNAL_ERROR" as const,
        }));
        if (errData.code === "GENERATION_LIMIT") {
          setRemainingGenerations(0);
        }
        setGenerationError(errData.error);
        return;
      }

      const generateData = await res.json();
      const generationId = generateData.generation_id;

      // Fetch status directly (API is synchronous)
      const statusRes = await fetch(`/api/ai-photo/status/${generationId}`);
      if (!statusRes.ok) {
        setGenerationError("Erro ao obter resultado da geracao");
        return;
      }

      const statusData = await statusRes.json();
      const gen = statusData.generation;

      if (gen.status === "failed") {
        const rawError = gen.error_message || "Falha na geracao";
        const isServiceError = rawError.includes("429") || rawError.includes("quota") || rawError.includes("timed out") || rawError.includes("credits") || rawError.includes("Kie.ai");
        setGenerationError(
          isServiceError
            ? "Servico de IA temporariamente indisponivel. Tente novamente em alguns minutos."
            : rawError
        );
        return;
      }

      // Success
      setGenerationResult(gen.variants, true);
      setRemainingGenerations((prev) => Math.max(0, prev - 1));
      setTimeout(() => setStep("results"), 600);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Erro ao gerar foto com IA";
      if (file.url || file.status === "done") {
        // Upload was done, error in generation
        setGenerationError(errorMsg);
      } else {
        setIsUploading(false);
        toast.error(error instanceof Error ? error.message : "Erro ao enviar foto");
        setFile((prev) => prev ? { ...prev, status: "error", error: "Falha no upload" } : prev);
      }
    }
  }, [file, lead.id, setGenerationError, setGenerationResult]);

  // Retry generation with same uploaded photo
  const handleRetryGeneration = useCallback(async () => {
    const photoUrl = file?.url;
    if (!photoUrl) return;

    setGenerationError(null);
    generationResultRef.current = null;
    setGenTick((t) => t + 1);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch("/api/ai-photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          photo_url: photoUrl,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        setGenerationError(errData.error);
        return;
      }

      const generateData = await res.json();
      const generationId = generateData.generation_id;

      const statusRes = await fetch(`/api/ai-photo/status/${generationId}`);
      if (!statusRes.ok) {
        setGenerationError("Erro ao obter resultado da geracao");
        return;
      }

      const statusData = await statusRes.json();
      const gen = statusData.generation;

      if (gen.status === "failed") {
        const rawError = gen.error_message || "Falha na geracao";
        const isServiceError = rawError.includes("429") || rawError.includes("quota") || rawError.includes("timed out") || rawError.includes("credits") || rawError.includes("Kie.ai");
        setGenerationError(
          isServiceError
            ? "Servico de IA temporariamente indisponivel. Tente novamente em alguns minutos."
            : rawError
        );
        return;
      }

      setGenerationResult(gen.variants, true);
      setRemainingGenerations((prev) => Math.max(0, prev - 1));
      setTimeout(() => setStep("results"), 600);
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : "Erro ao gerar foto com IA");
    }
  }, [file, lead.id, setGenerationError, setGenerationResult]);

  const handleRegenerate = useCallback(() => {
    generationResultRef.current = null;
    setGenerationError(null);
    setStep("generating");
    handleRetryGeneration();
  }, [setGenerationError, handleRetryGeneration]);

  const handleGenerateAnother = useCallback(() => {
    setFile((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
    generationResultRef.current = null;
    setGenerationError(null);
    setStep("upload");
  }, [setGenerationError]);

  // Back navigation
  const handleBack = useCallback(() => {
    switch (step) {
      case "upload":
        router.push("/hub");
        break;
      case "results":
        handleGenerateAnother();
        break;
    }
  }, [step, router, handleGenerateAnother]);

  return (
    <div className="min-h-screen bg-background">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            color: "hsl(var(--foreground))",
          },
        }}
      />

      <WizardHeader
        currentStep={step}
        remainingGenerations={remainingGenerations}
        onBack={handleBack}
        showBack={step !== "generating"}
      />

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <PhotoUploader
                  file={file}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  onSelectFile={handleSelectFile}
                  onRemoveFile={handleRemoveFile}
                  onGenerate={handleGenerate}
                />
              </motion.div>
            )}

            {step === "generating" && (
              <motion.div
                key="generating"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <GenerationLoading
                  templateName="Carnaval"
                  error={generationError}
                  isComplete={isComplete}
                  onRetry={handleRetryGeneration}
                  onCancel={() => router.push("/hub")}
                />
              </motion.div>
            )}

            {step === "results" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <ResultGallery
                  variants={variants}
                  remainingGenerations={remainingGenerations}
                  onGenerateAnother={handleGenerateAnother}
                  onRegenerate={handleRegenerate}
                  onBackToHub={() => router.push("/hub")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

/**
 * Client-only wrapper that handles lead auth check.
 */
export function AiPhotoClient() {
  const router = useRouter();
  const [leadData, setLeadData] = useState<StoredLead | null>(null);

  useEffect(() => {
    const lead = getStoredLead();
    if (!lead) {
      router.replace("/");
    } else {
      setLeadData(lead);
    }
  }, [router]);

  if (!leadData) {
    return null;
  }

  return <AiPhotoWizard lead={leadData} />;
}
