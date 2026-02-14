import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { drawPrize } from "@/lib/roleta/prizes";

export async function POST(request: Request) {
  try {
    const { lead_id } = (await request.json()) as { lead_id: string };

    if (!lead_id) {
      return NextResponse.json({ error: "lead_id obrigatorio" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify lead exists
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    // Check if already spun
    const { data: existingSpin } = await supabase
      .from("prize_wheel_spins")
      .select("prize_slug, prize_name")
      .eq("lead_id", lead_id)
      .single();

    if (existingSpin) {
      return NextResponse.json({
        already_spun: true,
        prize: { slug: existingSpin.prize_slug, name: existingSpin.prize_name },
      });
    }

    // Draw prize server-side
    const prize = drawPrize();

    // Save spin
    const { error: insertError } = await supabase
      .from("prize_wheel_spins")
      .insert({
        lead_id,
        prize_slug: prize.slug,
        prize_name: prize.name,
      });

    if (insertError) {
      // Unique constraint — race condition, already spun
      if (insertError.code === "23505") {
        const { data: raceSpin } = await supabase
          .from("prize_wheel_spins")
          .select("prize_slug, prize_name")
          .eq("lead_id", lead_id)
          .single();

        return NextResponse.json({
          already_spun: true,
          prize: { slug: raceSpin?.prize_slug, name: raceSpin?.prize_name },
        });
      }
      throw insertError;
    }

    return NextResponse.json({
      already_spun: false,
      prize: { slug: prize.slug, name: prize.name },
    });
  } catch (error) {
    console.error("[roleta/spin] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
