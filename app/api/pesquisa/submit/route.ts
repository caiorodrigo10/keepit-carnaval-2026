import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { SURVEY_QUESTIONS } from "@/lib/pesquisa/questions";

interface SubmitBody {
  lead_id: string;
  answers: Record<string, string | number>;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SubmitBody;

    if (!body.lead_id) {
      return NextResponse.json({ error: "lead_id obrigatorio" }, { status: 400 });
    }

    if (!body.answers || typeof body.answers !== "object") {
      return NextResponse.json({ error: "Respostas obrigatorias" }, { status: 400 });
    }

    // Validate required questions are answered
    for (const q of SURVEY_QUESTIONS) {
      if (q.required && !body.answers[q.id]) {
        return NextResponse.json({ error: `Pergunta obrigatoria: ${q.text}` }, { status: 400 });
      }
    }

    const supabase = createServiceClient();

    // Verify lead exists
    const { data: lead } = await supabase
      .from("leads")
      .select("id")
      .eq("id", body.lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    // Check if already answered
    const { data: existing } = await supabase
      .from("survey_responses")
      .select("id")
      .eq("lead_id", body.lead_id)
      .single();

    if (existing) {
      return NextResponse.json({ already_answered: true });
    }

    // Save response
    const { error: insertError } = await supabase
      .from("survey_responses")
      .insert({
        lead_id: body.lead_id,
        answers: body.answers,
      });

    if (insertError) {
      if (insertError.code === "23505") {
        return NextResponse.json({ already_answered: true });
      }
      throw insertError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pesquisa/submit] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
