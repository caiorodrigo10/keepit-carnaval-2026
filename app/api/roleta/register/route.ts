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

    // Validate
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
      leadName = existing.name;

      // Check if already spun
      const { data: spin } = await supabase
        .from("prize_wheel_spins")
        .select("prize_slug, prize_name")
        .eq("lead_id", leadId)
        .single();

      if (spin) {
        return NextResponse.json({
          lead_id: leadId,
          name: leadName,
          already_spun: true,
          prize: { slug: spin.prize_slug, name: spin.prize_name },
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
          origin: "roleta",
          lgpd_consent: true,
        })
        .select("id, name")
        .single();

      if (insertError) {
        // Unique constraint violation (race condition — lead was created between check and insert)
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
      already_spun: false,
    });
  } catch (error) {
    console.error("[roleta/register] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
