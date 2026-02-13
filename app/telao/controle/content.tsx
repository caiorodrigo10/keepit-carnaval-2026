"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Monitor,
  Wifi,
  WifiOff,
  Pause,
  Play,
  Image as ImageIcon,
  Camera,
  Users,
  RefreshCw,
} from "lucide-react";
import type { ScreenWithQueue } from "@/lib/screen-control/actions";
import type { ScreenStatus } from "@/types/database";
import { ScreenQueuePanel } from "@/components/screen-control/screen-queue-panel";
import { toast } from "sonner";
import { toggleScreenPause } from "@/lib/screen-control/actions";

interface ScreenControlDashboardProps {
  initialScreens: ScreenWithQueue[];
  initialStats: {
    totalScreens: number;
    onlineScreens: number;
    pausedScreens: number;
    offlineScreens: number;
    totalPhotosInQueue: number;
  };
}

export function ScreenControlDashboard({
  initialScreens,
  initialStats,
}: ScreenControlDashboardProps) {
  const [screens, setScreens] = useState<ScreenWithQueue[]>(initialScreens);
  const [stats, setStats] = useState(initialStats);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const supabase = createClient();

      // Refresh screens
      const { data: screensData } = await supabase
        .from("screens")
        .select("*")
        .order("name");

      if (screensData) {
        // Get queue counts
        const screensWithQueue = await Promise.all(
          screensData.map(async (screen) => {
            const { count } = await supabase
              .from("screen_queue")
              .select("*", { count: "exact", head: true })
              .eq("screen_id", screen.id);

            const { data: queueItem } = await supabase
              .from("screen_queue")
              .select("photo_id, photos(*)")
              .eq("screen_id", screen.id)
              .eq("position", 0)
              .single();

            return {
              ...screen,
              queueCount: count || 0,
              currentPhoto: queueItem?.photos || null,
            };
          })
        );

        setScreens(screensWithQueue as ScreenWithQueue[]);

        // Update stats
        const { count: totalQueue } = await supabase
          .from("screen_queue")
          .select("*", { count: "exact", head: true });

        setStats({
          totalScreens: screensData.length,
          onlineScreens: screensData.filter((s) => s.status === "online").length,
          pausedScreens: screensData.filter((s) => s.status === "paused").length,
          offlineScreens: screensData.filter((s) => s.status === "offline").length,
          totalPhotosInQueue: totalQueue || 0,
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Setup realtime subscription for screen status changes
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("screens-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "screens",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as ScreenWithQueue;
            setScreens((prev) =>
              prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s))
            );
            // Update stats based on status changes
            const old = payload.old as { status: ScreenStatus };
            const newStatus = updated.status;
            if (old.status !== newStatus) {
              setStats((prev) => {
                const newStats = { ...prev };
                // Decrement old status
                if (old.status === "online") newStats.onlineScreens--;
                else if (old.status === "paused") newStats.pausedScreens--;
                else if (old.status === "offline") newStats.offlineScreens--;
                // Increment new status
                if (newStatus === "online") newStats.onlineScreens++;
                else if (newStatus === "paused") newStats.pausedScreens++;
                else if (newStatus === "offline") newStats.offlineScreens++;
                return newStats;
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "screen_queue",
        },
        () => {
          // Refresh queue counts when queue changes
          handleRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handleRefresh]);

  const handleTogglePause = async (screenId: string) => {
    const result = await toggleScreenPause(screenId);
    if (result.success && result.newStatus) {
      toast.success(
        result.newStatus === "paused" ? "Telao pausado" : "Telao retomado"
      );
    } else {
      toast.error(result.error || "Erro ao alterar status");
    }
  };

  const getStatusBadge = (status: ScreenStatus) => {
    switch (status) {
      case "online":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 gap-1">
            <Wifi className="h-3 w-3" />
            Online
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600 gap-1">
            <Pause className="h-3 w-3" />
            Pausado
          </Badge>
        );
      case "offline":
        return (
          <Badge variant="destructive" className="gap-1">
            <WifiOff className="h-3 w-3" />
            Offline
          </Badge>
        );
    }
  };

  const selectedScreen = screens.find((s) => s.id === selectedScreenId);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Teloes
            </CardTitle>
            <Monitor className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalScreens}</div>
            <p className="text-xs text-muted-foreground">Teloes registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online
            </CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.onlineScreens}</div>
            <p className="text-xs text-muted-foreground">Exibindo fotos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pausados
            </CardTitle>
            <Pause className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pausedScreens}</div>
            <p className="text-xs text-muted-foreground">Em pausa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fotos na Fila
            </CardTitle>
            <ImageIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPhotosInQueue}</div>
            <p className="text-xs text-muted-foreground">Total em todas filas</p>
          </CardContent>
        </Card>
      </div>

      {/* Screen list and queue panel */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Screen list */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Teloes</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
              </Button>
            </div>
            <CardDescription>Selecione um telao para gerenciar sua fila</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {screens.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum telao cadastrado</p>
              </div>
            ) : (
              screens.map((screen) => (
                <div
                  key={screen.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedScreenId === screen.id
                      ? "border-keepit-brand bg-keepit-brand/5"
                      : "border-border hover:border-keepit-brand/50 hover:bg-accent"
                  }`}
                  onClick={() => setSelectedScreenId(screen.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{screen.name}</span>
                    {getStatusBadge(screen.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" />
                      {screen.queueCount} na fila
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePause(screen.id);
                        }}
                        disabled={screen.status === "offline"}
                      >
                        {screen.status === "paused" ? (
                          <Play className="h-4 w-4 text-green-500" />
                        ) : (
                          <Pause className="h-4 w-4 text-yellow-500" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {screen.last_ping && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Ultimo ping:{" "}
                      {new Date(screen.last_ping).toLocaleTimeString("pt-BR")}
                    </p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Queue panel */}
        <div className="lg:col-span-2">
          {selectedScreen ? (
            <ScreenQueuePanel screen={selectedScreen} />
          ) : (
            <Card className="h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center text-muted-foreground">
                <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Selecione um telao</p>
                <p className="text-sm">
                  Escolha um telao na lista para gerenciar sua fila de fotos
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-blue-500" />
              <span>Foto de fotografo</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span>Foto de usuario</span>
            </div>
            <div className="flex items-center gap-2 ml-auto text-muted-foreground">
              Proporcao ideal: <strong className="text-foreground">70% fotografo / 30% usuario</strong>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
