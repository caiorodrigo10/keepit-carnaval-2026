"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/lib/auth/actions";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  LogOut,
  Users,
  ChevronDown,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import type { Lead, LeadOrigin } from "@/types/database";
import type { AdminSession } from "@/lib/auth/types";
import type { ExportFilters } from "@/lib/leads/export";
import { exportToCSV, exportToExcel, filterLeads } from "@/lib/leads/export";

interface LeadsContentProps {
  leads: Lead[];
  session: AdminSession;
}

const ORIGIN_LABELS: Record<LeadOrigin, string> = {
  qr_code: "QR Code",
  spontaneous: "Espontaneo",
  traffic: "Trafego Pago",
  roleta: "Roleta",
  pesquisa: "Pesquisa",
};

const ORIGIN_COLORS: Record<LeadOrigin, string> = {
  qr_code: "bg-blue-100 text-blue-800",
  spontaneous: "bg-green-100 text-green-800",
  traffic: "bg-purple-100 text-purple-800",
  roleta: "bg-yellow-100 text-yellow-800",
  pesquisa: "bg-orange-100 text-orange-800",
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function LeadsContent({ leads, session }: LeadsContentProps) {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({
    startDate: "",
    endDate: "",
    origin: "all",
    franchiseInterest: "all",
  });

  // Calculate stats
  const stats = useMemo(() => {
    const total = leads.length;
    const franchiseInterested = leads.filter((l) => l.franchise_interest).length;
    const byOrigin = leads.reduce(
      (acc, lead) => {
        acc[lead.origin] = (acc[lead.origin] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { total, franchiseInterested, byOrigin };
  }, [leads]);

  // Filter leads for preview
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters);
  }, [leads, filters]);

  const handleExport = async (format: "csv" | "xlsx") => {
    setIsExporting(true);

    try {
      // Apply filters before export
      const leadsToExport = filterLeads(leads, filters);

      if (format === "csv") {
        exportToCSV(leadsToExport);
      } else {
        exportToExcel(leadsToExport);
      }

      setIsExportDialogOpen(false);
    } finally {
      setIsExporting(false);
    }
  };

  const handleQuickExport = (format: "csv" | "xlsx") => {
    if (format === "csv") {
      exportToCSV(leads);
    } else {
      exportToExcel(leads);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <a href="/admin/dashboard">
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Button>
            <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Leads</span>
              <span className="block text-xs text-muted-foreground">Keepit Carnaval 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{session.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{session.role}</p>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Leads</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie e exporte os leads capturados no evento
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Rapido
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleQuickExport("csv")}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport("xlsx")}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Export with Filters */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-keepit-brand hover:bg-keepit-brand/90">
                  <Filter className="h-4 w-4 mr-2" />
                  Exportar com Filtros
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Exportar Leads</DialogTitle>
                  <DialogDescription>
                    Configure os filtros e escolha o formato de exportacao
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Data Inicial</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={filters.startDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">Data Final</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={filters.endDate}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                      />
                    </div>
                  </div>

                  {/* Origin Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="origin">Origem</Label>
                    <Select
                      value={filters.origin as string}
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          origin: value as LeadOrigin | "all",
                        }))
                      }
                    >
                      <SelectTrigger id="origin">
                        <SelectValue placeholder="Todas as origens" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as origens</SelectItem>
                        <SelectItem value="qr_code">QR Code</SelectItem>
                        <SelectItem value="spontaneous">Espontaneo</SelectItem>
                        <SelectItem value="traffic">Trafego Pago</SelectItem>
                        <SelectItem value="roleta">Roleta</SelectItem>
                        <SelectItem value="pesquisa">Pesquisa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Franchise Interest Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="franchiseInterest">Interesse em Franquia</Label>
                    <Select
                      value={
                        filters.franchiseInterest === "all"
                          ? "all"
                          : filters.franchiseInterest
                            ? "yes"
                            : "no"
                      }
                      onValueChange={(value) =>
                        setFilters((prev) => ({
                          ...prev,
                          franchiseInterest:
                            value === "all" ? "all" : value === "yes",
                        }))
                      }
                    >
                      <SelectTrigger id="franchiseInterest">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="yes">Sim</SelectItem>
                        <SelectItem value="no">Nao</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Preview count */}
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">{filteredLeads.length}</strong> leads
                      correspondem aos filtros selecionados
                    </p>
                  </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => handleExport("csv")}
                    disabled={isExporting || filteredLeads.length === 0}
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    CSV
                  </Button>
                  <Button
                    onClick={() => handleExport("xlsx")}
                    disabled={isExporting || filteredLeads.length === 0}
                    className="bg-keepit-brand hover:bg-keepit-brand/90"
                  >
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                    )}
                    Excel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Leads
              </CardTitle>
              <Users className="h-4 w-4 text-keepit-brand" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interesse Franquia
              </CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.franchiseInterested}</div>
              <p className="text-xs text-muted-foreground">
                {stats.total > 0
                  ? ((stats.franchiseInterested / stats.total) * 100).toFixed(1)
                  : 0}
                % do total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">QR Code</CardTitle>
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-0">
                QR
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byOrigin.qr_code || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Espontaneo
              </CardTitle>
              <Badge variant="outline" className="bg-green-100 text-green-800 border-0">
                ESP
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.byOrigin.spontaneous || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Leads</CardTitle>
            <CardDescription>
              Todos os leads capturados durante o evento
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">Nenhum lead ainda</h3>
                <p className="text-muted-foreground">
                  Os leads aparecerao aqui quando forem capturados
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Franquia</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.slice(0, 50).map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>{formatPhone(lead.phone)}</TableCell>
                        <TableCell>{lead.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={ORIGIN_COLORS[lead.origin]}>
                            {ORIGIN_LABELS[lead.origin]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lead.franchise_interest ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                              Sim
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              Nao
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(lead.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {leads.length > 50 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Mostrando 50 de {leads.length} leads. Exporte para ver todos.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
