"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import {
  ImageIcon,
  Loader2,
  Calendar,
  Download,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { SharedHeader } from "@/components/shared-header";
import { createClient } from "@/lib/supabase/client";
import type { Photo } from "@/types/database";

const PHOTOS_PER_PAGE = 20;

type DateFilter = "all" | "today" | "yesterday" | "feb13" | "feb14" | "feb15";

function getDateRange(filter: DateFilter): { start: Date; end: Date } | null {
  if (filter === "all") return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (filter) {
    case "today":
      return {
        start: today,
        end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    case "yesterday": {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        start: yesterday,
        end: today,
      };
    }
    case "feb13": {
      const feb13 = new Date(2026, 1, 13);
      return {
        start: feb13,
        end: new Date(feb13.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    case "feb14": {
      const feb14 = new Date(2026, 1, 14);
      return {
        start: feb14,
        end: new Date(feb14.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    case "feb15": {
      const feb15 = new Date(2026, 1, 15);
      return {
        start: feb15,
        end: new Date(feb15.getTime() + 24 * 60 * 60 * 1000),
      };
    }
    default:
      return null;
  }
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function MuralContent() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [newPhotosCount, setNewPhotosCount] = useState(0);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const latestPhotoIdRef = useRef<string | null>(null);

  const selectedPhoto = selectedPhotoIndex !== null ? photos[selectedPhotoIndex] : null;

  // Fetch photos with pagination
  const fetchPhotos = useCallback(
    async (reset: boolean = false) => {
      if (reset) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const supabase = createClient();
        const currentPhotos = reset ? [] : photos;
        const offset = reset ? 0 : currentPhotos.length;

        let query = supabase
          .from("photos")
          .select("*", { count: "exact" })
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .range(offset, offset + PHOTOS_PER_PAGE - 1);

        // Apply date filter
        const dateRange = getDateRange(dateFilter);
        if (dateRange) {
          query = query
            .gte("created_at", dateRange.start.toISOString())
            .lt("created_at", dateRange.end.toISOString());
        }

        const { data, error, count } = await query;

        if (error) {
          throw error;
        }

        const newPhotos = data || [];
        const updatedPhotos = reset ? newPhotos : [...currentPhotos, ...newPhotos];

        setPhotos(updatedPhotos);
        setTotalCount(count || 0);
        setHasMore(updatedPhotos.length < (count || 0));

        // Track latest photo ID for realtime updates
        if (updatedPhotos.length > 0 && reset) {
          latestPhotoIdRef.current = updatedPhotos[0].id;
        }
      } catch {
        if (reset) {
          setPhotos([]);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [photos, dateFilter]
  );

  // Initial load
  useEffect(() => {
    fetchPhotos(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  // Setup Supabase Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("photos-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: "status=eq.approved",
        },
        () => {
          // Only count new photos if we're showing all dates
          if (dateFilter === "all") {
            setNewPhotosCount((prev) => prev + 1);
          }
          // If this photo matches our current filter, we could add it directly
          // But for UX, we show a "new photos" notification instead
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "photos",
        },
        (payload) => {
          const updatedPhoto = payload.new as Photo;

          // If photo was just approved, increment new photos count
          if (updatedPhoto.status === "approved" && dateFilter === "all") {
            setNewPhotosCount((prev) => prev + 1);
          }

          // Update existing photo in state
          setPhotos((prev) =>
            prev.map((photo) =>
              photo.id === updatedPhoto.id ? updatedPhoto : photo
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateFilter]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          fetchPhotos(false);
        }
      },
      { rootMargin: "200px" }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingMore, fetchPhotos]);

  // Load new photos
  function handleLoadNewPhotos() {
    setNewPhotosCount(0);
    fetchPhotos(true);
  }

  // Download photo
  async function handleDownload() {
    if (!selectedPhoto) return;

    setIsDownloading(true);
    try {
      const response = await fetch(selectedPhoto.file_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `keepit-carnaval-${selectedPhoto.id.slice(0, 8)}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Failed to download, try opening in new tab
      window.open(selectedPhoto.file_url, "_blank");
    } finally {
      setIsDownloading(false);
    }
  }

  // Share photo
  async function handleShare() {
    if (!selectedPhoto) return;

    const shareUrl = `${window.location.origin}/mural?photo=${selectedPhoto.id}`;
    const shareData = {
      title: "Keepit Carnaval 2026",
      text: "Confira essa foto do Carnaval 2026 no Anhembi!",
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy link to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        // Clipboard API not available
      }
    }
  }

  // Navigate photos in modal
  function handlePreviousPhoto() {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  }

  function handleNextPhoto() {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (selectedPhotoIndex === null) return;

      switch (e.key) {
        case "ArrowLeft":
          handlePreviousPhoto();
          break;
        case "ArrowRight":
          handleNextPhoto();
          break;
        case "Escape":
          setSelectedPhotoIndex(null);
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhotoIndex, photos.length]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SharedHeader title="Mural de Fotos" badge={!isLoading ? `${totalCount} fotos` : undefined} />

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 pt-12 pb-8">
        <h1 className="text-4xl sm:text-5xl font-black text-keepit-dark tracking-[-0.05em] leading-[0.95] mb-3">
          Mural de Fotos
        </h1>
        <p className="text-lg text-keepit-dark/60 max-w-xl">
          Todas as fotos do Carnaval 2026 no Anhembi
        </p>
      </div>

      {/* New Photos Notification */}
      {newPhotosCount > 0 && (
        <div className="sticky top-16 z-40 flex justify-center py-2">
          <Button
            onClick={handleLoadNewPhotos}
            className="bg-keepit-dark text-white hover:bg-black shadow-lg animate-pulse-glow"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {newPhotosCount} {newPhotosCount === 1 ? "nova foto" : "novas fotos"}
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <Select
              value={dateFilter}
              onValueChange={(value) => setDateFilter(value as DateFilter)}
            >
              <SelectTrigger className="w-[180px] bg-card border-border/50">
                <SelectValue placeholder="Filtrar por data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as datas</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="feb13">13 de Fevereiro</SelectItem>
                <SelectItem value="feb14">14 de Fevereiro</SelectItem>
                <SelectItem value="feb15">15 de Fevereiro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Photo Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="aspect-square rounded-2xl"
              />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6">
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground mb-2">
              Nenhuma foto encontrada
            </h2>
            <p className="text-muted-foreground max-w-sm">
              {dateFilter !== "all"
                ? "Nao encontramos fotos para este periodo. Tente outro filtro."
                : "As fotos do evento aparecerao aqui em breve!"}
            </p>
            {dateFilter !== "all" && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setDateFilter("all")}
              >
                Ver todas as fotos
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="group relative aspect-square rounded-2xl overflow-hidden bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-keepit-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <Image
                    src={photo.thumbnail_url || photo.file_url}
                    alt="Foto do Carnaval"
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <p className="text-white text-xs font-medium">
                        {formatDate(photo.created_at)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Load More Trigger / Loading State */}
            <div ref={loadMoreRef} className="flex justify-center py-8">
              {isLoadingMore ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Carregando mais fotos...</span>
                </div>
              ) : hasMore ? (
                <div className="h-10" />
              ) : (
                <p className="text-muted-foreground text-sm">
                  Voce viu todas as {totalCount} fotos!
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Photo Lightbox Modal */}
      <Dialog
        open={selectedPhotoIndex !== null}
        onOpenChange={() => setSelectedPhotoIndex(null)}
      >
        <DialogContent
          className="max-w-4xl w-[95vw] h-[90vh] p-0 bg-white border-border overflow-hidden"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Visualizar foto
          </DialogTitle>
          {selectedPhoto && (
            <div className="relative w-full h-full flex flex-col">
              {/* Modal Header */}
              <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-white/95 to-transparent">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-white/90 border-border text-foreground">
                    {(selectedPhotoIndex ?? 0) + 1} / {photos.length}
                  </Badge>
                  <span className="text-muted-foreground text-sm hidden sm:inline">
                    {formatDate(selectedPhoto.created_at)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="text-foreground hover:bg-muted"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    <span className="sr-only">Download</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    className="text-foreground hover:bg-muted"
                  >
                    {isCopied ? (
                      <Check className="w-5 h-5 text-keepit-brand" />
                    ) : typeof navigator !== "undefined" && "share" in navigator ? (
                      <Share2 className="w-5 h-5" />
                    ) : (
                      <LinkIcon className="w-5 h-5" />
                    )}
                    <span className="sr-only">Compartilhar</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedPhotoIndex(null)}
                    className="text-foreground hover:bg-muted"
                  >
                    <X className="w-5 h-5" />
                    <span className="sr-only">Fechar</span>
                  </Button>
                </div>
              </div>

              {/* Photo */}
              <div className="flex-1 relative flex items-center justify-center p-4 bg-muted/30">
                <Image
                  src={selectedPhoto.file_url}
                  alt="Foto do Carnaval em tamanho completo"
                  fill
                  className="object-contain"
                  sizes="95vw"
                  priority
                />
              </div>

              {/* Navigation Buttons */}
              {selectedPhotoIndex !== null && selectedPhotoIndex > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePreviousPhoto}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-foreground bg-white/80 hover:bg-white shadow-md h-12 w-12"
                >
                  <ChevronLeft className="w-8 h-8" />
                  <span className="sr-only">Foto anterior</span>
                </Button>
              )}
              {selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextPhoto}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground bg-white/80 hover:bg-white shadow-md h-12 w-12"
                >
                  <ChevronRight className="w-8 h-8" />
                  <span className="sr-only">Proxima foto</span>
                </Button>
              )}

              {/* Mobile Action Bar */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white/95 to-transparent sm:hidden">
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex-1 bg-white border-border text-foreground hover:bg-muted"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Baixar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShare}
                    className="flex-1 bg-white border-border text-foreground hover:bg-muted"
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 mr-2 text-keepit-brand" />
                    ) : (
                      <Share2 className="w-4 h-4 mr-2" />
                    )}
                    {isCopied ? "Copiado!" : "Compartilhar"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
