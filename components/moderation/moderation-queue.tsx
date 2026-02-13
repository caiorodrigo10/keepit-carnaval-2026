"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoCard } from "./photo-card";
import {
  approvePhoto,
  rejectPhoto,
  blockUser,
  batchApprovePhotos,
  batchRejectPhotos,
} from "@/lib/moderation/actions";
import {
  Check,
  X,
  Camera,
  Clock,
  ArrowUpDown,
  RefreshCw,
  Keyboard,
} from "lucide-react";
import type { Photo } from "@/types/database";
import { toast } from "sonner";

interface ModerationQueueProps {
  initialPhotos: Photo[];
  initialStats: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  };
}

type SortOrder = "oldest" | "newest";
type SourceFilter = "all" | "photographer" | "user";

export function ModerationQueue({
  initialPhotos,
  initialStats,
}: ModerationQueueProps) {
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [stats, setStats] = useState(initialStats);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);
  const [sortOrder, setSortOrder] = useState<SortOrder>("oldest");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter and sort photos
  const filteredPhotos = photos
    .filter((photo) => {
      if (sourceFilter === "all") return true;
      return photo.source === sourceFilter;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "oldest" ? dateA - dateB : dateB - dateA;
    });

  // Setup realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("photos-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "photos",
          filter: "status=eq.pending",
        },
        (payload) => {
          const newPhoto = payload.new as Photo;
          setPhotos((prev) => [newPhoto, ...prev]);
          setStats((prev) => ({ ...prev, pending: prev.pending + 1 }));
          toast.info("Nova foto na fila!");
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
          if (updatedPhoto.status !== "pending") {
            // Remove from queue if no longer pending
            setPhotos((prev) => prev.filter((p) => p.id !== updatedPhoto.id));
            setSelectedIds((prev) => {
              const newSet = new Set(prev);
              newSet.delete(updatedPhoto.id);
              return newSet;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Store handlers in refs to avoid dependency issues
  const handlersRef = useRef({
    handleApprove: async (_id: string) => {},
    handleReject: async (_id: string) => {},
    handleBlock: async (_id: string) => {},
    handleBatchApprove: async () => {},
    handleBatchReject: async () => {},
  });

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const hasSelection = selectedIds.size > 0;
      const focusedPhoto = filteredPhotos[focusedIndex];

      switch (e.key.toLowerCase()) {
        case "a":
          if (e.ctrlKey || e.metaKey) {
            // Ctrl+A = select all
            e.preventDefault();
            const allIds = new Set(filteredPhotos.map((p) => p.id));
            setSelectedIds(allIds);
          } else if (hasSelection) {
            // A = approve selected
            e.preventDefault();
            handlersRef.current.handleBatchApprove();
          } else if (focusedPhoto) {
            // A = approve focused
            e.preventDefault();
            handlersRef.current.handleApprove(focusedPhoto.id);
          }
          break;

        case "r":
          if (hasSelection) {
            e.preventDefault();
            handlersRef.current.handleBatchReject();
          } else if (focusedPhoto) {
            e.preventDefault();
            handlersRef.current.handleReject(focusedPhoto.id);
          }
          break;

        case "b":
          if (focusedPhoto && focusedPhoto.user_email) {
            e.preventDefault();
            handlersRef.current.handleBlock(focusedPhoto.id);
          }
          break;

        case "escape":
          e.preventDefault();
          setSelectedIds(new Set());
          setFocusedIndex(-1);
          break;

        case "arrowdown":
        case "j":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredPhotos.length - 1 ? prev + 1 : prev
          );
          break;

        case "arrowup":
        case "k":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;

        case "arrowright":
        case "l":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const columns = getColumnCount();
            const next = prev + columns;
            return next < filteredPhotos.length ? next : prev;
          });
          break;

        case "arrowleft":
        case "h":
          e.preventDefault();
          setFocusedIndex((prev) => {
            const columns = getColumnCount();
            const next = prev - columns;
            return next >= 0 ? next : prev;
          });
          break;

        case " ":
          if (focusedPhoto) {
            e.preventDefault();
            handleSelect(focusedPhoto.id, !selectedIds.has(focusedPhoto.id));
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredPhotos, focusedIndex, selectedIds]);

  // Get column count based on viewport
  function getColumnCount(): number {
    if (typeof window === "undefined") return 4;
    if (window.innerWidth < 640) return 2;
    if (window.innerWidth < 1024) return 3;
    return 4;
  }

  // Handlers
  function handleSelect(id: string, selected: boolean) {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }

  function handleSelectAll() {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  }

  async function handleApprove(id: string) {
    const result = await approvePhoto(id);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        approvedToday: prev.approvedToday + 1,
      }));
      toast.success("Foto aprovada!");
    } else {
      toast.error(result.error || "Erro ao aprovar foto");
    }
  }

  async function handleReject(id: string) {
    const result = await rejectPhoto(id);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.id !== id));
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        rejectedToday: prev.rejectedToday + 1,
      }));
      toast.success("Foto rejeitada");
    } else {
      toast.error(result.error || "Erro ao rejeitar foto");
    }
  }

  async function handleBlock(id: string) {
    const result = await blockUser(id);
    if (result.success) {
      // Remove all photos from this user
      const blockedPhoto = photos.find((p) => p.id === id);
      if (blockedPhoto?.user_email) {
        const removedCount = photos.filter(
          (p) => p.user_email === blockedPhoto.user_email
        ).length;
        setPhotos((prev) =>
          prev.filter((p) => p.user_email !== blockedPhoto.user_email)
        );
        setStats((prev) => ({
          ...prev,
          pending: prev.pending - removedCount,
          rejectedToday: prev.rejectedToday + removedCount,
        }));
      }
      toast.success("Usuario bloqueado");
    } else {
      toast.error(result.error || "Erro ao bloquear usuario");
    }
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const result = await batchApprovePhotos(ids);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - ids.length,
        approvedToday: prev.approvedToday + ids.length,
      }));
      setSelectedIds(new Set());
      toast.success(`${ids.length} fotos aprovadas!`);
    } else {
      toast.error(result.error || "Erro ao aprovar fotos");
    }
  }

  async function handleBatchReject() {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    const result = await batchRejectPhotos(ids);
    if (result.success) {
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - ids.length,
        rejectedToday: prev.rejectedToday + ids.length,
      }));
      setSelectedIds(new Set());
      toast.success(`${ids.length} fotos rejeitadas`);
    } else {
      toast.error(result.error || "Erro ao rejeitar fotos");
    }
  }

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("photos")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: sortOrder === "oldest" });

      if (data) {
        setPhotos(data);
        setStats((prev) => ({ ...prev, pending: data.length }));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [sortOrder]);

  // Update handlers ref for keyboard shortcuts
  handlersRef.current = {
    handleApprove,
    handleReject,
    handleBlock,
    handleBatchApprove,
    handleBatchReject,
  };

  const allSelected =
    filteredPhotos.length > 0 && selectedIds.size === filteredPhotos.length;

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovacao
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aprovadas Hoje
            </CardTitle>
            <Camera className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvedToday}</div>
            <p className="text-xs text-muted-foreground">Fotos aprovadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Rejeitadas Hoje
            </CardTitle>
            <Camera className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rejectedToday}</div>
            <p className="text-xs text-muted-foreground">Fotos rejeitadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>Fila de Moderacao</CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" />
                {filteredPhotos.length} pendentes
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Refresh button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                />
                Atualizar
              </Button>

              {/* Sort order */}
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as SortOrder)}
              >
                <SelectTrigger className="w-[140px]" size="sm">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Mais antigas</SelectItem>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                </SelectContent>
              </Select>

              {/* Source filter */}
              <Select
                value={sourceFilter}
                onValueChange={(v) => setSourceFilter(v as SourceFilter)}
              >
                <SelectTrigger className="w-[140px]" size="sm">
                  <Camera className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="photographer">Fotografo</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <CardDescription className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Atalhos: A=aprovar, R=rejeitar, B=bloquear, Espaco=selecionar,
            Setas=navegar, Ctrl+A=selecionar tudo
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Batch actions */}
          {filteredPhotos.length > 0 && (
            <div className="flex items-center gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selecionadas`
                    : "Selecionar todas"}
                </span>
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    size="sm"
                    variant="default"
                    className="bg-green-600 hover:bg-green-700"
                    onClick={handleBatchApprove}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Aprovar ({selectedIds.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleBatchReject}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Rejeitar ({selectedIds.size})
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Photo grid */}
          {filteredPhotos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPhotos.map((photo, index) => (
                <PhotoCard
                  key={photo.id}
                  photo={photo}
                  isSelected={selectedIds.has(photo.id)}
                  onSelect={handleSelect}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onBlock={handleBlock}
                  isFocused={focusedIndex === index}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Camera className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma foto pendente
              </p>
              <p className="text-sm text-muted-foreground">
                As fotos enviadas pelos participantes aparecerao aqui para
                moderacao
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
