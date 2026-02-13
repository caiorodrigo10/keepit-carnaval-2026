"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Camera, Users, Search, Plus, Check } from "lucide-react";
import type { Photo } from "@/types/database";
import { getAvailablePhotos, addToQueue } from "@/lib/screen-control/actions";
import { toast } from "sonner";
import Image from "next/image";

interface AddPhotoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  screenId: string;
  onPhotoAdded: () => void;
}

export function AddPhotoDialog({
  open,
  onOpenChange,
  screenId,
  onPhotoAdded,
}: AddPhotoDialogProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "photographer" | "user">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) {
      loadPhotos();
    } else {
      // Reset state when dialog closes
      setSearchQuery("");
      setSourceFilter("all");
      setAddedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, screenId]);

  useEffect(() => {
    let filtered = photos;

    // Filter by source
    if (sourceFilter !== "all") {
      filtered = filtered.filter((p) => p.source === sourceFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.user_name?.toLowerCase().includes(query) ||
          p.user_email?.toLowerCase().includes(query)
      );
    }

    setFilteredPhotos(filtered);
  }, [photos, searchQuery, sourceFilter]);

  async function loadPhotos() {
    setIsLoading(true);
    try {
      const availablePhotos = await getAvailablePhotos(screenId, 50);
      setPhotos(availablePhotos);
      setFilteredPhotos(availablePhotos);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddPhoto(photoId: string) {
    setAddingIds((prev) => new Set(prev).add(photoId));
    try {
      const result = await addToQueue(screenId, photoId);
      if (result.success) {
        setAddedIds((prev) => new Set(prev).add(photoId));
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        toast.success("Foto adicionada a fila");
        onPhotoAdded();
      } else {
        toast.error(result.error || "Erro ao adicionar foto");
      }
    } finally {
      setAddingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(photoId);
        return newSet;
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Foto a Fila</DialogTitle>
          <DialogDescription>
            Selecione fotos aprovadas para adicionar a fila de exibicao
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sourceFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("all")}
            >
              Todas
            </Button>
            <Button
              variant={sourceFilter === "photographer" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("photographer")}
              className="gap-1"
            >
              <Camera className="h-4 w-4" />
              Fotografo
            </Button>
            <Button
              variant={sourceFilter === "user" ? "default" : "outline"}
              size="sm"
              onClick={() => setSourceFilter("user")}
              className="gap-1"
            >
              <Users className="h-4 w-4" />
              Usuario
            </Button>
          </div>
        </div>

        {/* Photo grid */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma foto disponivel</p>
              <p className="text-sm">
                {photos.length === 0
                  ? "Todas as fotos aprovadas ja estao na fila"
                  : "Nenhuma foto corresponde aos filtros"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-keepit-brand transition-colors"
                >
                  {/* Image */}
                  <div className="relative h-full w-full bg-muted">
                    {photo.thumbnail_url || photo.file_url ? (
                      <Image
                        src={photo.thumbnail_url || photo.file_url}
                        alt="Foto"
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(max-width: 640px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Source badge */}
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 text-xs gap-1"
                  >
                    {photo.source === "photographer" ? (
                      <>
                        <Camera className="h-3 w-3" />
                        Fot
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3" />
                        Usr
                      </>
                    )}
                  </Badge>

                  {/* Hover overlay with add button */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {addedIds.has(photo.id) ? (
                      <div className="text-green-400 flex items-center gap-1">
                        <Check className="h-5 w-5" />
                        Adicionada
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAddPhoto(photo.id)}
                        disabled={addingIds.has(photo.id)}
                      >
                        {addingIds.has(photo.id) ? (
                          "Adicionando..."
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">
                      {photo.user_name || "Anonimo"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {filteredPhotos.length} fotos disponiveis
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
