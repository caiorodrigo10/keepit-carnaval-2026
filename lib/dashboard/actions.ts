"use server";

import { createClient } from "@/lib/supabase/server";
import type { LeadOrigin } from "@/types/database";

export interface DashboardStats {
  totalPhotos: number;
  photographerPhotos: number;
  userPhotos: number;
  photosDisplayed: number;
  totalLeads: number;
  franchiseInterestCount: number;
  franchiseInterestPercentage: number;
  conversionRate: number;
  leadsToday: number;
  photosToday: number;
}

export interface LeadsByOrigin {
  origin: LeadOrigin;
  count: number;
  label: string;
}

export interface TimelineData {
  timestamp: string;
  label: string;
  leads: number;
  photos: number;
}

export async function getDashboardStats(
  startDate?: string,
  endDate?: string
): Promise<DashboardStats> {
  const supabase = await createClient();

  // Get photos stats
  let photosQuery = supabase.from("photos").select("id, source, displayed_count", { count: "exact" });
  if (startDate) photosQuery = photosQuery.gte("created_at", startDate);
  if (endDate) photosQuery = photosQuery.lte("created_at", endDate);

  const { data: photos, count: totalPhotos } = await photosQuery;

  const photographerPhotos = photos?.filter((p) => p.source === "photographer").length || 0;
  const userPhotos = photos?.filter((p) => p.source === "user").length || 0;
  const photosDisplayed = photos?.filter((p) => (p.displayed_count || 0) > 0).length || 0;

  // Get leads stats
  let leadsQuery = supabase.from("leads").select("id, franchise_interest", { count: "exact" });
  if (startDate) leadsQuery = leadsQuery.gte("created_at", startDate);
  if (endDate) leadsQuery = leadsQuery.lte("created_at", endDate);

  const { data: leads, count: totalLeads } = await leadsQuery;

  const franchiseInterestCount = leads?.filter((l) => l.franchise_interest).length || 0;
  const franchiseInterestPercentage = totalLeads
    ? Math.round((franchiseInterestCount / totalLeads) * 100)
    : 0;

  // Get today's counts
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const { count: leadsToday } = await supabase
    .from("leads")
    .select("id", { count: "exact" })
    .gte("created_at", todayIso);

  const { count: photosToday } = await supabase
    .from("photos")
    .select("id", { count: "exact" })
    .gte("created_at", todayIso);

  // Conversion rate placeholder (would need page visits tracking)
  // For now, we'll show 0% as page visits are not tracked
  const conversionRate = 0;

  return {
    totalPhotos: totalPhotos || 0,
    photographerPhotos,
    userPhotos,
    photosDisplayed,
    totalLeads: totalLeads || 0,
    franchiseInterestCount,
    franchiseInterestPercentage,
    conversionRate,
    leadsToday: leadsToday || 0,
    photosToday: photosToday || 0,
  };
}

export async function getLeadsByOrigin(
  startDate?: string,
  endDate?: string
): Promise<LeadsByOrigin[]> {
  const supabase = await createClient();

  let query = supabase.from("leads").select("origin");
  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data: leads } = await query;

  if (!leads) return [];

  const originLabels: Record<LeadOrigin, string> = {
    qr_code: "QR Code",
    spontaneous: "Espontaneo",
    traffic: "Trafego Pago",
    roleta: "Roleta",
    pesquisa: "Pesquisa",
  };

  const counts = leads.reduce<Record<LeadOrigin, number>>((acc, lead) => {
    acc[lead.origin] = (acc[lead.origin] || 0) + 1;
    return acc;
  }, {} as Record<LeadOrigin, number>);

  return Object.entries(counts).map(([origin, count]) => ({
    origin: origin as LeadOrigin,
    count,
    label: originLabels[origin as LeadOrigin] || origin,
  }));
}

export async function getTimelineData(
  startDate?: string,
  endDate?: string,
  groupBy: "hour" | "day" = "hour"
): Promise<TimelineData[]> {
  const supabase = await createClient();

  // Get all leads and photos within range
  let leadsQuery = supabase.from("leads").select("created_at");
  let photosQuery = supabase.from("photos").select("created_at");

  if (startDate) {
    leadsQuery = leadsQuery.gte("created_at", startDate);
    photosQuery = photosQuery.gte("created_at", startDate);
  }
  if (endDate) {
    leadsQuery = leadsQuery.lte("created_at", endDate);
    photosQuery = photosQuery.lte("created_at", endDate);
  }

  const [{ data: leads }, { data: photos }] = await Promise.all([
    leadsQuery,
    photosQuery,
  ]);

  // Group by time period
  const formatKey = (date: Date) => {
    if (groupBy === "hour") {
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:00`;
    }
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  const formatLabel = (date: Date) => {
    if (groupBy === "hour") {
      return `${String(date.getHours()).padStart(2, "0")}:00`;
    }
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
  };

  const timeline: Record<string, { leads: number; photos: number; date: Date }> = {};

  leads?.forEach((lead) => {
    const date = new Date(lead.created_at);
    const key = formatKey(date);
    if (!timeline[key]) {
      timeline[key] = { leads: 0, photos: 0, date };
    }
    timeline[key].leads++;
  });

  photos?.forEach((photo) => {
    const date = new Date(photo.created_at);
    const key = formatKey(date);
    if (!timeline[key]) {
      timeline[key] = { leads: 0, photos: 0, date };
    }
    timeline[key].photos++;
  });

  return Object.entries(timeline)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([timestamp, data]) => ({
      timestamp,
      label: formatLabel(data.date),
      leads: data.leads,
      photos: data.photos,
    }));
}
