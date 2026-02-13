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
  type TemplatesResponse,
  type VariantInfo,
  type AiPhotoErrorResponse,
} from "@/types/ai-photo";
import { getStoredLead, type StoredLead } from "@/lib/lead-storage";
import { WizardHeader } from "@/components/ai-photo/wizard-header";
import { TemplateSelector } from "@/components/ai-photo/template-selector";
import {
  PhotoUploader,
  type UploadableFile,
} from "@/components/ai-photo/photo-uploader";
import { GenerationLoading } from "@/components/ai-photo/generation-loading";
import { ResultGallery } from "@/components/ai-photo/result-gallery";
import type { WizardStep } from "@/components/ai-photo/wizard-stepper";

type TemplateInfo = TemplatesResponse["templates"][number];

interface AiPhotoWizardProps {
  lead: StoredLead;
}

export function AiPhotoWizard({ lead }: AiPhotoWizardProps) {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<WizardStep>("templates");

  // Step 1: Templates
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateInfo | null>(null);

  // Step 2: Photos
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Step 3: Generation — use ref + counter to guarantee re-render
  const generationErrorRef = useRef<string | null>(null);
  const generationResultRef = useRef<{ variants: VariantInfo[]; isComplete: boolean } | null>(null);
  const [genTick, setGenTick] = useState(0);

  // Derived values from refs (re-read on every render triggered by genTick)
  const generationError = generationErrorRef.current;
  const isComplete = generationResultRef.current?.isComplete ?? false;

  // Stable setter that always triggers re-render
  const setGenerationError = useCallback((error: string | null) => {
    generationErrorRef.current = error;
    setGenTick((t) => t + 1);
  }, []);
  const setGenerationResult = useCallback((variants: VariantInfo[], isComplete: boolean) => {
    generationResultRef.current = { variants, isComplete };
    setGenTick((t) => t + 1);
  }, []);

  // Step 4: Results (derived from ref)
  const variants = generationResultRef.current?.variants ?? [];

  // Global
  const [remainingGenerations, setRemainingGenerations] = useState<number>(
    AI_PHOTO_LIMITS.MAX_GENERATIONS_PER_LEAD
  );

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
    checkGenerationLimit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchTemplates() {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const res = await fetch("/api/ai-photo/templates");
      if (!res.ok) throw new Error("Falha ao carregar modelos");
      const data: TemplatesResponse = await res.json();
      setTemplates(data.templates);
    } catch {
      setTemplatesError("Nao foi possivel carregar os modelos. Verifique sua conexao.");
    } finally {
      setTemplatesLoading(false);
    }
  }

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

  // Step 1 handlers
  const handleSelectTemplate = useCallback((template: TemplateInfo) => {
    setSelectedTemplate(template);
  }, []);

  const handleContinueToUpload = useCallback(() => {
    if (selectedTemplate) setStep("upload");
  }, [selectedTemplate]);

  // Step 2 handlers
  const handleAddFiles = useCallback(
    (fileList: FileList) => {
      const currentCount = files.length;
      const maxToAdd = AI_PHOTO_LIMITS.MAX_REFERENCE_PHOTOS - currentCount;
      if (maxToAdd <= 0) {
        toast.error(`Maximo de ${AI_PHOTO_LIMITS.MAX_REFERENCE_PHOTOS} fotos atingido`);
        return;
      }

      const newFiles: UploadableFile[] = [];
      const limit = Math.min(fileList.length, maxToAdd);

      for (let i = 0; i < limit; i++) {
        const file = fileList[i];
        const error = validateImageFile(file);
        if (error) {
          toast.error(error);
          continue;
        }
        newFiles.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          file,
          preview: URL.createObjectURL(file),
          status: "pending",
          url: null,
          error: null,
        });
      }

      if (newFiles.length > 0) {
        setFiles((prev) => [...prev, ...newFiles]);
      }
    },
    [files.length]
  );

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || files.length < AI_PHOTO_LIMITS.MIN_REFERENCE_PHOTOS) return;

    setIsUploading(true);
    setUploadProgress(0);

    const supabase = createClient();
    const uploadedUrls: string[] = [];
    const totalFiles = files.length;

    try {
      // Upload all files to Supabase Storage
      for (let i = 0; i < totalFiles; i++) {
        const f = files[i];

        // Mark compressing
        setFiles((prev) =>
          prev.map((p) => (p.id === f.id ? { ...p, status: "compressing" } : p))
        );
        setUploadProgress(Math.round(((i * 2) / (totalFiles * 2)) * 80));

        const compressed = await compressImage(f.file, fullSizeCompressionOptions);

        // Mark uploading
        setFiles((prev) =>
          prev.map((p) => (p.id === f.id ? { ...p, status: "uploading" } : p))
        );
        setUploadProgress(Math.round(((i * 2 + 1) / (totalFiles * 2)) * 80));

        const timestamp = Date.now();
        const path = `references/${lead.id}/${timestamp}-${i}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("ai-photos")
          .upload(path, compressed, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Erro ao enviar foto ${i + 1}: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage
          .from("ai-photos")
          .getPublicUrl(path);

        uploadedUrls.push(urlData.publicUrl);

        // Mark done
        setFiles((prev) =>
          prev.map((p) =>
            p.id === f.id ? { ...p, status: "done", url: urlData.publicUrl } : p
          )
        );
      }

      setUploadProgress(90);

      // Transition to generating step
      setIsUploading(false);
      setStep("generating");
      setGenerationError(null);
      generationResultRef.current = null;
      setGenTick((t) => t + 1);

      // Call generate API
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch("/api/ai-photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          template_id: selectedTemplate.id,
          reference_photos: uploadedUrls,
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

      // Fetch status directly (no useEffect needed since API is synchronous)
      const statusRes = await fetch(`/api/ai-photo/status/${generationId}`);
      if (!statusRes.ok) {
        setGenerationError("Erro ao obter resultado da geracao");
        return;
      }

      const statusData = await statusRes.json();
      const gen = statusData.generation;

      if (gen.status === "failed") {
        const rawError = gen.error_message || "Todas as variantes falharam";
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
      // If uploads were completed, we're in the generation phase
      if (uploadedUrls.length === totalFiles) {
        setGenerationError(errorMsg);
      } else {
        setIsUploading(false);
        toast.error(
          error instanceof Error ? error.message : "Erro ao enviar fotos"
        );
        setFiles((prev) =>
          prev.map((f) =>
            f.status !== "done" ? { ...f, status: "error", error: "Falha no upload" } : f
          )
        );
      }
    }
  }, [selectedTemplate, files, lead.id]);

  const handleRetryGeneration = useCallback(async () => {
    setGenerationError(null);
    generationResultRef.current = null;
    setGenTick((t) => t + 1);
    const uploadedUrls = files.filter((f) => f.url).map((f) => f.url!);
    if (uploadedUrls.length < AI_PHOTO_LIMITS.MIN_REFERENCE_PHOTOS || !selectedTemplate) return;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 180_000);

      const res = await fetch("/api/ai-photo/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          template_id: selectedTemplate.id,
          reference_photos: uploadedUrls,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({
          error: "Erro desconhecido",
        }));
        setGenerationError(errData.error);
        return;
      }

      const generateData = await res.json();
      const generationId = generateData.generation_id;

      // Fetch status directly
      const statusRes = await fetch(`/api/ai-photo/status/${generationId}`);
      if (!statusRes.ok) {
        setGenerationError("Erro ao obter resultado da geracao");
        return;
      }

      const statusData = await statusRes.json();
      const gen = statusData.generation;

      if (gen.status === "failed") {
        const rawError = gen.error_message || "Todas as variantes falharam";
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
      setGenerationError(
        err instanceof Error ? err.message : "Erro ao gerar foto com IA"
      );
    }
  }, [files, selectedTemplate, lead.id]);

  const handleRegenerate = useCallback(() => {
    // Re-generate with same template and photos
    generationResultRef.current = null;
    setGenerationError(null);
    setStep("generating");
    // Trigger generation again
    handleRetryGeneration();
  }, [setGenerationError, handleRetryGeneration]);

  const handleGenerateAnother = useCallback(() => {
    // Reset for new generation with different template
    setSelectedTemplate(null);
    setFiles([]);
    generationResultRef.current = null;
    setGenerationError(null);
    setStep("templates");
  }, [setGenerationError]);

  // Back navigation
  const handleBack = useCallback(() => {
    switch (step) {
      case "templates":
        router.push("/hub");
        break;
      case "upload":
        setStep("templates");
        break;
      case "results":
        // Don't go back to generating, go to templates
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
            {step === "templates" && (
              <motion.div
                key="templates"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <TemplateSelector
                  templates={templates}
                  isLoading={templatesLoading}
                  error={templatesError}
                  selectedId={selectedTemplate?.id ?? null}
                  onSelect={handleSelectTemplate}
                  onContinue={handleContinueToUpload}
                  onRetry={fetchTemplates}
                />
              </motion.div>
            )}

            {step === "upload" && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <PhotoUploader
                  files={files}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                  onAddFiles={handleAddFiles}
                  onRemoveFile={handleRemoveFile}
                  onGenerate={handleGenerate}
                  onBack={() => setStep("templates")}
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
                  templateName={selectedTemplate?.name ?? ""}
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
                  templateName={selectedTemplate?.name ?? ""}
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
 * Loaded via dynamic import with ssr: false to avoid hydration mismatch.
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
