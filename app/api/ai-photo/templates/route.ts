import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { TemplatesResponse } from "@/types/ai-photo";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("ai_photo_templates")
      .select("id, slug, name, description, preview_url, aspect_ratio")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Erro ao buscar templates" },
        { status: 500 }
      );
    }

    const response: TemplatesResponse = {
      templates: data ?? [],
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
