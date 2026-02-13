"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  getDashboardStats,
  getLeadsByOrigin,
  getTimelineData,
  type DashboardStats,
  type LeadsByOrigin,
  type TimelineData,
} from "@/lib/dashboard";
import { StatCard } from "./stat-card";
import { LeadsByOriginChart } from "./leads-by-origin-chart";
import { TimelineChart } from "./timeline-chart";
import { DateRangeFilter } from "./date-range-filter";
import {
  Camera,
  Users,
  TrendingUp,
  Building2,
  BarChart3,
  Monitor,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardContentProps {
  initialStats: DashboardStats;
  initialLeadsByOrigin: LeadsByOrigin[];
  initialTimeline: TimelineData[];
  startDate?: string;
  endDate?: string;
}

export function DashboardContent({
  initialStats,
  initialLeadsByOrigin,
  initialTimeline,
  startDate,
  endDate,
}: DashboardContentProps) {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [leadsByOrigin, setLeadsByOrigin] = useState<LeadsByOrigin[]>(initialLeadsByOrigin);
  const [timeline, setTimeline] = useState<TimelineData[]>(initialTimeline);

  // Compute isLive based on props - no need for useState
  const isLive = useMemo(() => !startDate && !endDate, [startDate, endDate]);

  const refreshData = useCallback(async () => {
    try {
      const [newStats, newLeadsByOrigin, newTimeline] = await Promise.all([
        getDashboardStats(startDate, endDate),
        getLeadsByOrigin(startDate, endDate),
        getTimelineData(startDate, endDate),
      ]);
      setStats(newStats);
      setLeadsByOrigin(newLeadsByOrigin);
      setTimeline(newTimeline);
    } catch {
      // Silently fail, keeping existing data
    }
  }, [startDate, endDate]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Only enable real-time when not filtering by date
    if (!isLive) {
      return;
    }

    const supabase = createClient();

    // Subscribe to leads changes
    const leadsChannel = supabase
      .channel("dashboard-leads")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => {
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to photos changes
    const photosChannel = supabase
      .channel("dashboard-photos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "photos" },
        () => {
          refreshData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(photosChannel);
    };
  }, [isLive, refreshData]);

  const handleRefresh = useCallback(() => {
    router.refresh();
    refreshData();
  }, [router, refreshData]);

  return (
    <div className="space-y-6">
      {/* Header with live indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          {isLive && (
            <Badge variant="outline" className="border-keepit-brand text-keepit-brand gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-keepit-brand opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-keepit-brand"></span>
              </span>
              Tempo Real
            </Badge>
          )}
        </div>
      </div>
      <p className="text-muted-foreground">
        Metricas do evento Keepit Carnaval 2026
      </p>

      {/* Date Range Filter */}
      <DateRangeFilter onRefresh={handleRefresh} />

      {/* KPI Cards - Primary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total de Leads"
          value={stats.totalLeads.toLocaleString("pt-BR")}
          description={`${stats.leadsToday} hoje`}
          icon={Users}
          variant="highlight"
        />
        <StatCard
          title="Total de Fotos"
          value={stats.totalPhotos.toLocaleString("pt-BR")}
          description={`${stats.photosToday} hoje`}
          icon={Camera}
        />
        <StatCard
          title="Fotos Exibidas"
          value={stats.photosDisplayed.toLocaleString("pt-BR")}
          description="Exibidas no telao"
          icon={Monitor}
        />
        <StatCard
          title="Taxa de Conversao"
          value={`${stats.conversionRate}%`}
          description="Acesso para lead"
          icon={TrendingUp}
        />
      </div>

      {/* KPI Cards - Secondary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Fotos Fotografo"
          value={stats.photographerPhotos.toLocaleString("pt-BR")}
          description="Fotos profissionais"
          icon={Camera}
        />
        <StatCard
          title="Fotos Espontaneas"
          value={stats.userPhotos.toLocaleString("pt-BR")}
          description="Upload de usuarios"
          icon={Sparkles}
        />
        <StatCard
          title="Interesse em Franquia"
          value={stats.franchiseInterestCount.toLocaleString("pt-BR")}
          description={`${stats.franchiseInterestPercentage}% do total`}
          icon={Building2}
          variant="highlight"
        />
        <StatCard
          title="Percentual Franquia"
          value={`${stats.franchiseInterestPercentage}%`}
          description="Leads interessados"
          icon={BarChart3}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <LeadsByOriginChart data={leadsByOrigin} />
        <TimelineChart data={timeline} />
      </div>
    </div>
  );
}
