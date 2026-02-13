"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle,
  XCircle,
  Ban,
  Clock,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import type { ModerationAction } from "@/types/database";

interface ModerationMetrics {
  totalApproved: number;
  totalRejected: number;
  totalBlocked: number;
  todayApproved: number;
  todayRejected: number;
  pendingCount: number;
  slaViolations: number;
  avgModerationTime: number;
  rejectionRate: string;
}

interface Moderator {
  id: string;
  name: string;
}

interface ModerationLogEntry {
  id: string;
  photo_id: string | null;
  moderator_id: string | null;
  action: ModerationAction;
  reason: string | null;
  created_at: string;
  photo: {
    thumbnail_url: string | null;
    file_url: string;
    source: string;
  } | null;
  moderator: {
    name: string;
  } | null;
}

interface Props {
  metrics: ModerationMetrics;
  moderators: Moderator[];
}

const ITEMS_PER_PAGE = 10;

export function ModerationHistoryContent({ metrics, moderators }: Props) {
  const [logs, setLogs] = useState<ModerationLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [moderatorFilter, setModeratorFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const supabaseRef = useRef(createClient());
  const isMountedRef = useRef(true);

  // Effect for initial mount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Main data fetching effect
  useEffect(() => {
    const fetchData = async () => {
      const supabase = supabaseRef.current;

      let query = supabase
        .from("moderation_log")
        .select(
          `
          id,
          photo_id,
          moderator_id,
          action,
          reason,
          created_at,
          photo:photos!moderation_log_photo_id_fkey(thumbnail_url, file_url, source),
          moderator:admin_users!moderation_log_moderator_id_fkey(name)
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false });

      // Apply filters
      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter as ModerationAction);
      }

      if (moderatorFilter !== "all") {
        query = query.eq("moderator_id", moderatorFilter);
      }

      if (dateFrom) {
        query = query.gte("created_at", `${dateFrom}T00:00:00`);
      }

      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }

      // Pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data, count } = await query;

      if (isMountedRef.current) {
        setLogs((data as unknown as ModerationLogEntry[]) || []);
        setTotalCount(count || 0);
        setLoading(false);
      }
    };

    fetchData();
  }, [actionFilter, moderatorFilter, dateFrom, dateTo, currentPage]);

  const resetFilters = () => {
    setActionFilter("all");
    setModeratorFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const exportToCSV = async () => {
    const supabase = supabaseRef.current;
    // Fetch all data without pagination for export
    let query = supabase
      .from("moderation_log")
      .select(
        `
        id,
        action,
        reason,
        created_at,
        photo:photos!moderation_log_photo_id_fkey(file_url, source),
        moderator:admin_users!moderation_log_moderator_id_fkey(name)
      `
      )
      .order("created_at", { ascending: false });

    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter as ModerationAction);
    }

    if (moderatorFilter !== "all") {
      query = query.eq("moderator_id", moderatorFilter);
    }

    if (dateFrom) {
      query = query.gte("created_at", `${dateFrom}T00:00:00`);
    }

    if (dateTo) {
      query = query.lte("created_at", `${dateTo}T23:59:59`);
    }

    const { data } = await query;

    if (!data || data.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }

    // Create CSV
    const headers = ["Data/Hora", "Acao", "Moderador", "Origem Foto", "Motivo"];
    const rows = data.map((log) => {
      const photo = log.photo as { file_url: string; source: string } | null;
      const moderator = log.moderator as { name: string } | null;
      return [
        new Date(log.created_at).toLocaleString("pt-BR"),
        log.action,
        moderator?.name || "Sistema",
        photo?.source || "-",
        log.reason || "-",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    // Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historico-moderacao-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getActionBadge = (action: ModerationAction) => {
    switch (action) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Aprovada
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeitada
          </Badge>
        );
      case "blocked":
        return (
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
            <Ban className="h-3 w-3 mr-1" />
            Bloqueada
          </Badge>
        );
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* SLA Alert */}
      {metrics.slaViolations > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <div>
            <p className="font-medium text-yellow-800">
              Alerta de SLA: {metrics.slaViolations}{" "}
              {metrics.slaViolations === 1 ? "foto" : "fotos"} pendente
              {metrics.slaViolations === 1 ? "" : "s"} ha mais de 5 minutos
            </p>
            <p className="text-sm text-yellow-700">
              O SLA de moderacao esta sendo excedido. Priorize a fila de
              moderacao.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Aprovadas
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalApproved}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.todayApproved} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Rejeitadas
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRejected}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.todayRejected} hoje
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Medio
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatTime(metrics.avgModerationTime)}
            </div>
            <p className="text-xs text-muted-foreground">
              para moderar (ultimas 100)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Rejeicao
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rejectionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.pendingCount} pendentes na fila
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre o historico de moderacao por acao, moderador ou data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="action-filter">Acao</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger id="action-filter">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="approved">Aprovadas</SelectItem>
                  <SelectItem value="rejected">Rejeitadas</SelectItem>
                  <SelectItem value="blocked">Bloqueadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moderator-filter">Moderador</Label>
              <Select
                value={moderatorFilter}
                onValueChange={setModeratorFilter}
              >
                <SelectTrigger id="moderator-filter">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {moderators.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-from">Data Inicio</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-to">Data Fim</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={resetFilters}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historico de Acoes</CardTitle>
          <CardDescription>
            {totalCount} {totalCount === 1 ? "registro" : "registros"}{" "}
            encontrado
            {totalCount === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <ImageIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhum registro encontrado
              </p>
              <p className="text-sm text-muted-foreground">
                Tente ajustar os filtros ou aguarde novas moderacoes
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Foto</TableHead>
                    <TableHead>Acao</TableHead>
                    <TableHead>Moderador</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Data/Hora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {log.photo?.thumbnail_url || log.photo?.file_url ? (
                          <div className="relative h-12 w-12">
                            <Image
                              src={log.photo.thumbnail_url || log.photo.file_url}
                              alt="Foto moderada"
                              fill
                              className="object-cover rounded"
                              sizes="48px"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell>
                        {log.moderator?.name || (
                          <span className="text-muted-foreground">Sistema</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {log.photo?.source === "photographer"
                            ? "Fotografo"
                            : "Usuario"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.reason || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Pagina {currentPage} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Proximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
