"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  SkipForward,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Camera,
  Users,
  RefreshCw,
  GripVertical,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ScreenWithQueue, QueueItem, ScreenQueueStats } from "@/lib/screen-control/actions";
import {
  getScreenQueue,
  getScreenQueueStats,
  skipCurrentPhoto,
  removeFromQueue,
  reorderQueueItem,
} from "@/lib/screen-control/actions";
import { toast } from "sonner";
import { AddPhotoDialog } from "./add-photo-dialog";
import Image from "next/image";

interface ScreenQueuePanelProps {
  screen: ScreenWithQueue;
}

export function ScreenQueuePanel({ screen }: ScreenQueuePanelProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<ScreenQueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const loadQueueData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [items, queueStats] = await Promise.all([
        getScreenQueue(screen.id, 20),
        getScreenQueueStats(screen.id),
      ]);
      setQueueItems(items);
      setStats(queueStats);
    } finally {
      setIsLoading(false);
    }
  }, [screen.id]);

  useEffect(() => {
    loadQueueData();
  }, [loadQueueData]);

  // Setup realtime subscription for queue changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`queue-${screen.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "screen_queue",
          filter: `screen_id=eq.${screen.id}`,
        },
        () => {
          loadQueueData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screen.id, loadQueueData]);

  const handleSkipCurrent = async () => {
    const result = await skipCurrentPhoto(screen.id);
    if (result.success) {
      toast.success("Foto pulada");
      loadQueueData();
    } else {
      toast.error(result.error || "Erro ao pular foto");
    }
  };

  const handleRemoveFromQueue = async (itemId: string) => {
    const result = await removeFromQueue(screen.id, itemId);
    if (result.success) {
      toast.success("Foto removida da fila");
      loadQueueData();
    } else {
      toast.error(result.error || "Erro ao remover foto");
    }
  };

  const handleMoveUp = async (itemId: string, currentPosition: number) => {
    if (currentPosition === 0) return;
    const result = await reorderQueueItem(screen.id, itemId, currentPosition - 1);
    if (result.success) {
      loadQueueData();
    } else {
      toast.error(result.error || "Erro ao reordenar");
    }
  };

  const handleMoveDown = async (itemId: string, currentPosition: number) => {
    if (currentPosition >= queueItems.length - 1) return;
    const result = await reorderQueueItem(screen.id, itemId, currentPosition + 1);
    if (result.success) {
      loadQueueData();
    } else {
      toast.error(result.error || "Erro ao reordenar");
    }
  };

  const getRatioColor = (photographerPercentage: number) => {
    // Target is 70% photographer
    const diff = Math.abs(photographerPercentage - 70);
    if (diff <= 5) return "bg-green-500";
    if (diff <= 15) return "bg-yellow-500";
    return "bg-red-500";
  };

  const isOnline = screen.status === "online" || screen.status === "paused";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {screen.name}
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
            </CardTitle>
            <CardDescription>
              {queueItems.length} fotos na fila de exibicao
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadQueueData}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSkipCurrent}
              disabled={queueItems.length === 0}
            >
              <SkipForward className="h-4 w-4 mr-1" />
              Pular Atual
            </Button>
            <Button
              size="sm"
              className="bg-keepit-brand hover:bg-keepit-brand/90"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Ratio indicator */}
        {stats && stats.totalPhotos > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1">
                <Camera className="h-4 w-4 text-blue-500" />
                Fotografo: {stats.photographerPercentage}%
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-4 w-4 text-purple-500" />
                Usuario: {stats.userPercentage}%
              </span>
            </div>
            <div className="relative">
              <Progress
                value={stats.photographerPercentage}
                className="h-3"
              />
              {/* Target line at 70% */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-foreground/50"
                style={{ left: "70%" }}
                title="Meta: 70%"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Meta: 70% fotografo</span>
              <Badge
                variant="outline"
                className={`${getRatioColor(stats.photographerPercentage)} text-white border-0`}
              >
                {Math.abs(stats.photographerPercentage - 70) <= 5
                  ? "Proporcao OK"
                  : stats.photographerPercentage > 70
                  ? "Mais usuarios necessarios"
                  : "Mais fotografos necessarios"}
              </Badge>
            </div>
          </div>
        )}

        {/* Queue list */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : queueItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Fila vazia</p>
              <p className="text-sm">Adicione fotos para exibir no telao</p>
            </div>
          ) : (
            queueItems.map((item, index) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  index === 0
                    ? "border-keepit-brand bg-keepit-brand/5"
                    : "border-border"
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-muted-foreground hover:text-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                {/* Position */}
                <div className="w-8 text-center">
                  <span
                    className={`text-sm font-medium ${
                      index === 0 ? "text-keepit-brand" : "text-muted-foreground"
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>

                {/* Thumbnail */}
                <div className="relative h-14 w-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                  {item.photo.thumbnail_url || item.photo.file_url ? (
                    <Image
                      src={item.photo.thumbnail_url || item.photo.file_url}
                      alt="Foto"
                      fill
                      className="object-cover"
                      loading="lazy"
                      sizes="56px"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <Camera className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {item.photo.source === "photographer" ? (
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Camera className="h-3 w-3" />
                        Fotografo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Users className="h-3 w-3" />
                        Usuario
                      </Badge>
                    )}
                    {index === 0 && (
                      <Badge className="bg-keepit-brand text-xs">Exibindo</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {item.photo.user_name || "Anonimo"} -{" "}
                    {new Date(item.photo.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMoveUp(item.id, item.position)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMoveDown(item.id, item.position)}
                    disabled={index === queueItems.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => handleRemoveFromQueue(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>

      <AddPhotoDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        screenId={screen.id}
        onPhotoAdded={loadQueueData}
      />
    </Card>
  );
}
