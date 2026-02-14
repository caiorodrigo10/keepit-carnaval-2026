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

  // Orders (table not in generated types, use rpc/fetch workaround)
  const ordersRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=customer_name,customer_email,customer_phone,total,status,created_at&order=created_at.desc&limit=50`,
    {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        Prefer: "count=exact",
      },
    }
  );
  const ordersRecent = ordersRes.ok ? await ordersRes.json() : [];
  const totalOrders = parseInt(ordersRes.headers.get("content-range")?.split("/")[1] || "0");
  const pendingOrders = ordersRecent.filter((o: { status: string }) => o.status === "pending").length;
  const confirmedOrders = ordersRecent.filter((o: { status: string }) => o.status === "confirmed").length;

  // AI templates usage
  const { data: templateUsageRaw } = await supabase
    .from("ai_photo_generations")
    .select("template_id")
    .eq("status", "completed");

  // Get template names
  const { data: templates } = await supabase
    .from("ai_photo_templates")
    .select("id, name");

  const templateMap = new Map((templates ?? []).map((t) => [t.id, t.name]));

  const templateCounts: Record<string, { name: string; count: number }> = {};
  if (templateUsageRaw) {
    for (const gen of templateUsageRaw) {
      const tid = gen.template_id;
      if (!templateCounts[tid]) {
        templateCounts[tid] = { name: templateMap.get(tid) || "Desconhecido", count: 0 };
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
