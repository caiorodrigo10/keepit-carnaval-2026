"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, RefreshCw } from "lucide-react";
import { useCallback, useState, useTransition } from "react";

interface DateRangeFilterProps {
  onRefresh?: () => void;
}

export function DateRangeFilter({ onRefresh }: DateRangeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [startDate, setStartDate] = useState(searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end") || "");

  const applyFilter = useCallback(() => {
    startTransition(() => {
      const params = new URLSearchParams();
      if (startDate) params.set("start", startDate);
      if (endDate) params.set("end", endDate);

      router.push(`/admin/dashboard${params.toString() ? `?${params.toString()}` : ""}`);
    });
  }, [startDate, endDate, router]);

  const clearFilter = useCallback(() => {
    setStartDate("");
    setEndDate("");
    startTransition(() => {
      router.push("/admin/dashboard");
    });
  }, [router]);

  const setToday = useCallback(() => {
    const today = new Date().toISOString().split("T")[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const setLastWeek = useCallback(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    setStartDate(start.toISOString().split("T")[0]);
    setEndDate(end.toISOString().split("T")[0]);
  }, []);

  return (
    <div className="flex flex-wrap items-end gap-4 p-4 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Periodo</span>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <Label htmlFor="start-date" className="text-xs">
            Inicio
          </Label>
          <Input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="end-date" className="text-xs">
            Fim
          </Label>
          <Input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-[160px]"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={setToday}
            type="button"
          >
            Hoje
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={setLastWeek}
            type="button"
          >
            7 dias
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={applyFilter}
            size="sm"
            disabled={isPending}
            className="bg-keepit-brand hover:bg-keepit-brand/90"
          >
            Aplicar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilter}
            disabled={isPending}
          >
            Limpar
          </Button>
        </div>
      </div>

      {onRefresh && (
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isPending}
          className="ml-auto"
          title="Atualizar dados"
        >
          <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
        </Button>
      )}
    </div>
  );
}
