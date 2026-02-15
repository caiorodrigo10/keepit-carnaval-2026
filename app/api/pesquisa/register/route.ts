import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface RegisterBody {
  name: string;
  email: string;
  phone: string;
  lgpd_consent: boolean;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RegisterBody;

    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json({ error: "Nome deve ter pelo menos 3 caracteres" }, { status: 400 });
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }
    const cleanPhone = (body.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json({ error: "Telefone invalido" }, { status: 400 });
    }
    if (!body.lgpd_consent) {
      return NextResponse.json({ error: "Voce precisa aceitar os termos" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Check if lead already exists (by email or phone)
    const { data: existing } = await supabase
      .from("leads")
      .select("id, name, email")
      .or(`email.eq.${body.email},phone.eq.${cleanPhone}`)
      .limit(1)
      .single();

    let leadId: string;
    let leadName: string;

    if (existing) {
      leadId = existing.id;
      leadName = body.name.trim();

      // Update name if changed
      if (existing.name !== body.name.trim()) {
        await supabase
          .from("leads")
          .update({ name: body.name.trim() })
          .eq("id", leadId);
      }

      // Check if already answered survey
      const { data: survey } = await supabase
        .from("survey_responses")
        .select("id, prize_slug, prize_name")
        .eq("lead_id", leadId)
        .single();

      if (survey) {
        return NextResponse.json({
          lead_id: leadId,
          name: leadName,
          already_answered: true,
          prize: survey.prize_slug
            ? { slug: survey.prize_slug, name: survey.prize_name }
            : null,
        });
      }
    } else {
      // Create new lead
      const { data: newLead, error: insertError } = await supabase
        .from("leads")
        .insert({
          name: body.name.trim(),
          email: body.email.trim().toLowerCase(),
          phone: cleanPhone,
          origin: "pesquisa",
          lgpd_consent: true,
        })
        .select("id, name")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          const { data: retryLead } = await supabase
            .from("leads")
            .select("id, name")
            .or(`email.eq.${body.email},phone.eq.${cleanPhone}`)
            .limit(1)
            .single();

          if (retryLead) {
            leadId = retryLead.id;
            leadName = retryLead.name;
          } else {
            throw insertError;
          }
        } else {
          throw insertError;
        }
      } else {
        leadId = newLead!.id;
        leadName = newLead!.name;
      }
    }

    return NextResponse.json({
      lead_id: leadId,
      name: leadName,
      already_answered: false,
    });
  } catch (error) {
    console.error("[pesquisa/register] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
