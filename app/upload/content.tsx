"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Camera,
  Upload,
  X,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Info,
} from "lucide-react";
import { SharedHeader } from "@/components/shared-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  compressImage,
  fullSizeCompressionOptions,
  ACCEPTED_IMAGE_TYPES,
  validateImageFile,
} from "@/lib/image-compression";
import { Toaster, toast } from "sonner";
import type { StoredLead } from "@/lib/lead-storage";

interface UserPhotoUploadProps {
  lead: StoredLead;
}

type UploadStatus = "idle" | "selected" | "compressing" | "uploading" | "success" | "error";

const DAILY_LIMIT = 3;

export function UserPhotoUpload({ lead }: UserPhotoUploadProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todayUploads, setTodayUploads] = useState(0);
  const [isCheckingLimit, setIsCheckingLimit] = useState(true);

  // Check daily upload limit on mount
  useEffect(() => {
    async function checkDailyLimit() {
      try {
        const supabase = createClient();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count, error } = await supabase
          .from("photos")
          .select("*", { count: "exact", head: true })
          .eq("user_email", lead.email)
          .eq("source", "user")
          .gte("created_at", today.toISOString());

        if (error) {
          setTodayUploads(0);
        } else {
          setTodayUploads(count || 0);
        }
      } catch {
        setTodayUploads(0);
      } finally {
        setIsCheckingLimit(false);
      }
    }

    checkDailyLimit();
  }, [lead.email]);

  const remainingUploads = Math.max(0, DAILY_LIMIT - todayUploads);
  const canUpload = remainingUploads > 0;

  const handleFileSelect = (file: File | null) => {
    if (!file) return;

    const error = validateImageFile(file);
    if (error) {
      setErrorMessage(error);
      setStatus("error");
      toast.error(error);
      return;
    }

    // Revoke previous preview URL
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
    setStatus("selected");
    setErrorMessage(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
    // Reset input
    e.target.value = "";
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
  };

  const handleGallerySelect = () => {
    inputRef.current?.click();
  };

  const clearSelection = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    setStatus("idle");
    setProgress(0);
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !canUpload) return;

    const supabase = createClient();

    try {
      // Step 1: Compress
      setStatus("compressing");
      setProgress(10);

      const compressedBlob = await compressImage(selectedFile, fullSizeCompressionOptions);
      setProgress(30);

      // Step 2: Upload to storage
      setStatus("uploading");
      setProgress(40);

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(7);
      const filename = `user/${lead.id}/${timestamp}-${randomStr}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filename, compressedBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setProgress(70);

      // Step 3: Get public URL
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(filename);

      // Step 4: Insert record in photos table
      // User photos go to moderation queue (status: pending)
      const { error: insertError } = await supabase.from("photos").insert({
        photographer_id: null,
        file_url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        source: "user",
        status: "pending",
        user_name: lead.name,
        user_email: lead.email,
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setProgress(100);
      setStatus("success");
      setTodayUploads((prev) => prev + 1);

      toast.success("Foto enviada para moderacao!", {
        description: "Sua foto sera analisada e aparecera no mural em breve.",
        icon: <CheckCircle2 className="w-5 h-5 text-keepit-brand" />,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Erro ao enviar foto";
      setErrorMessage(msg);
      setStatus("error");
      toast.error("Erro ao enviar foto", {
        description: msg,
      });
    }
  };

  const handleSendAnother = () => {
    clearSelection();
  };

  const isProcessing = status === "compressing" || status === "uploading";

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

      {/* Header */}
      <SharedHeader title="Enviar Foto" badge={`${remainingUploads}/${DAILY_LIMIT} hoje`} />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="max-w-lg mx-auto space-y-6">
          {/* Instructions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Card className="card-keepit">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-keepit-brand/10 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5 text-keepit-brand" />
                  </div>
                  <div>
                    <h2 className="font-black tracking-tight text-lg text-foreground mb-1">
                      Envie sua foto!
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Tire uma foto ou escolha da galeria. Sua foto sera analisada e
                      pode aparecer no telao do evento!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Upload Limit Warning */}
          {!canUpload && !isCheckingLimit && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-destructive mb-1">
                        Limite diario atingido
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Voce ja enviou {DAILY_LIMIT} fotos hoje. Volte amanha para
                        enviar mais!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Upload Area */}
          {canUpload && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.4, delay: 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <Card className="card-keepit overflow-hidden">
                <CardContent className="p-0">
                  {/* Hidden inputs */}
                  <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED_IMAGE_TYPES.join(",")}
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleInputChange}
                    className="hidden"
                    disabled={isProcessing}
                  />

                  {/* Idle State - Show upload options */}
                  {status === "idle" && (
                    <div className="p-6">
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-keepit-brand/10 flex items-center justify-center">
                          <ImageIcon className="w-10 h-10 text-keepit-brand" />
                        </div>
                        <div className="text-center">
                          <p className="text-foreground font-medium">
                            Escolha como enviar sua foto
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            JPG, PNG ou WebP - Max 20MB
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                          <Button
                            variant="default"
                            className="flex-1 bg-keepit-dark text-white hover:bg-black font-semibold"
                            onClick={handleCameraCapture}
                          >
                            <Camera className="w-5 h-5 mr-2" />
                            Tirar Foto
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-keepit-dark/10 text-keepit-dark hover:bg-keepit-dark/5"
                            onClick={handleGallerySelect}
                          >
                            <Upload className="w-5 h-5 mr-2" />
                            Galeria
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Selected/Processing State - Show preview */}
                  {(status === "selected" || isProcessing) && preview && (
                    <div className="relative">
                      {/* Preview Image */}
                      <div className="aspect-square relative">
                        <img
                          src={preview}
                          alt="Preview da foto"
                          className={cn(
                            "w-full h-full object-cover transition-opacity",
                            isProcessing && "opacity-70"
                          )}
                        />

                        {/* Processing Overlay */}
                        {isProcessing && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <div className="text-center text-white">
                              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" />
                              <p className="font-medium">
                                {status === "compressing" ? "Comprimindo..." : "Enviando..."}
                              </p>
                              <p className="text-sm opacity-80 mt-1">{progress}%</p>
                            </div>
                          </div>
                        )}

                        {/* Clear button (only when not processing) */}
                        {status === "selected" && (
                          <button
                            onClick={clearSelection}
                            className="absolute top-3 right-3 w-10 h-10 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        )}
                      </div>

                      {/* Progress bar */}
                      {isProcessing && (
                        <div className="absolute bottom-0 left-0 right-0">
                          <Progress value={progress} className="h-1 rounded-none bg-black/20" />
                        </div>
                      )}

                      {/* Actions */}
                      {status === "selected" && (
                        <div className="p-4 border-t border-border">
                          <Button
                            variant="default"
                            className="w-full bg-keepit-dark text-white hover:bg-black font-semibold"
                            onClick={handleUpload}
                          >
                            <Upload className="w-5 h-5 mr-2" />
                            Enviar Foto
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Success State */}
                  {status === "success" && (
                    <div className="p-6">
                      <div className="flex flex-col items-center gap-4 py-8">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 200 }}
                          className="w-20 h-20 rounded-full bg-keepit-brand/20 flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-10 h-10 text-keepit-brand" />
                        </motion.div>
                        <div className="text-center">
                          <h3 className="text-xl font-semibold text-foreground">
                            Foto enviada!
                          </h3>
                          <p className="text-muted-foreground mt-2">
                            Sua foto foi enviada para moderacao. Em breve ela podera
                            aparecer no mural e no telao!
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full mt-4">
                          {remainingUploads > 1 && (
                            <Button
                              variant="default"
                              className="flex-1 bg-keepit-dark text-white hover:bg-black font-semibold"
                              onClick={handleSendAnother}
                            >
                              <Camera className="w-5 h-5 mr-2" />
                              Enviar Outra
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="flex-1 border-border text-foreground hover:bg-accent"
                            onClick={() => router.push("/hub")}
                          >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Voltar ao Hub
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {status === "error" && (
                    <div className="p-6">
                      <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                          <AlertCircle className="w-10 h-10 text-destructive" />
                        </div>
                        <div className="text-center">
                          <h3 className="text-xl font-semibold text-foreground">
                            Erro ao enviar
                          </h3>
                          <p className="text-muted-foreground mt-2">
                            {errorMessage || "Ocorreu um erro ao enviar sua foto."}
                          </p>
                        </div>
                        <Button
                          variant="default"
                          className="bg-keepit-dark text-white hover:bg-black font-semibold"
                          onClick={clearSelection}
                        >
                          Tentar Novamente
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Tips Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <Card className="card-keepit">
              <CardContent className="p-4">
                <h3 className="font-medium text-foreground mb-3">Dicas para sua foto</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                    <span>Boa iluminacao melhora a qualidade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                    <span>Evite fotos borradas ou muito escuras</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-keepit-brand shrink-0 mt-0.5" />
                    <span>Fotos com seu rosto aparecem mais no telao</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span>Conteudo inapropriado sera rejeitado</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
