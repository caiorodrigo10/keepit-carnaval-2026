import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const DASHBOARD_PASSWORD = "Keepit2026#";

export async function POST(request: Request) {
  const { password } = await request.json();
  if (password !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Operação disponível apenas em ambiente local" }, { status: 403 });
  }

  const pw = request.headers.get("x-password");
  if (pw !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "IDs obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Also delete files from storage
  for (const id of ids) {
    const { data: gen } = await supabase
      .from("ai_photo_generations")
      .select("variant_1_url")
      .eq("id", id)
      .single();

    if (gen?.variant_1_url) {
      const path = gen.variant_1_url.split("/ai-photos/").pop();
      if (path) {
        await supabase.storage.from("ai-photos").remove([path]);
      }
    }
  }

  const { error } = await supabase
    .from("ai_photo_generations")
    .delete()
    .in("id", ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: ids.length });
}

export async function GET(request: Request) {
  const pw = request.headers.get("x-password");
  if (pw !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const perPage = parseInt(searchParams.get("per_page") || "10", 10);
  const offset = (page - 1) * perPage;
  const status = searchParams.get("status") || "all";
  const outputsOnly = searchParams.get("outputs_only") === "true";

  const supabase = createServiceClient();

  if (outputsOnly) {
    const { data, count, error } = await supabase
      .from("ai_photo_generations")
      .select("id, variant_1_url, created_at", { count: "exact" })
      .eq("status", "completed")
      .not("variant_1_url", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      generations: data || [],
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    });
  }

  let query = supabase
    .from("ai_photo_generations")
    .select("id, status, reference_photos, variant_1_url, error_message, processing_time_ms, created_at", { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status as "processing" | "completed" | "failed");
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    generations: data || [],
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  });
}
