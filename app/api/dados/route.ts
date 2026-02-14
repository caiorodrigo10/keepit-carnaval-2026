import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const DASHBOARD_PASSWORD = "Keepit2026#";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Leads stats
  const { count: totalLeads } = await supabase
    .from("leads")
    .select("*", { count: "exact", head: true });

  const { data: leadsRecent } = await supabase
    .from("leads")
    .select("name, email, phone, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // AI Photo generations
  const { count: totalGenerations } = await supabase
    .from("ai_photo_generations")
    .select("*", { count: "exact", head: true });

  const { count: completedGenerations } = await supabase
    .from("ai_photo_generations")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed");

  const { count: failedGenerations } = await supabase
    .from("ai_photo_generations")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  // Orders
  const { count: totalOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const { count: pendingOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const { count: confirmedOrders } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed");

  const { data: ordersRecent } = await supabase
    .from("orders")
    .select("customer_name, customer_email, customer_phone, total, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  // AI templates usage
  const { data: templateUsage } = await supabase
    .from("ai_photo_generations")
    .select("template_id, ai_photo_templates(name)")
    .eq("status", "completed");

  // Count per template
  const templateCounts: Record<string, { name: string; count: number }> = {};
  if (templateUsage) {
    for (const gen of templateUsage) {
      const tid = gen.template_id;
      const tname = (gen as unknown as { ai_photo_templates: { name: string } | null }).ai_photo_templates?.name || "Desconhecido";
      if (!templateCounts[tid]) {
        templateCounts[tid] = { name: tname, count: 0 };
      }
      templateCounts[tid].count++;
    }
  }

  return NextResponse.json({
    leads: {
      total: totalLeads ?? 0,
      recent: leadsRecent ?? [],
    },
    aiPhotos: {
      total: totalGenerations ?? 0,
      completed: completedGenerations ?? 0,
      failed: failedGenerations ?? 0,
      templateUsage: Object.values(templateCounts).sort((a, b) => b.count - a.count),
    },
    orders: {
      total: totalOrders ?? 0,
      pending: pendingOrders ?? 0,
      confirmed: confirmedOrders ?? 0,
      recent: ordersRecent ?? [],
    },
  });
}
