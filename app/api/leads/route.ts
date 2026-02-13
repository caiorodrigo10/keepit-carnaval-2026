import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeadOrigin } from "@/types/database";

interface LeadPayload {
  name: string;
  phone: string;
  email: string;
  franchise_interest: boolean;
  lgpd_consent: boolean;
  origin: LeadOrigin;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LeadPayload;

    // Validate required fields
    if (!body.name || !body.phone || !body.email) {
      return NextResponse.json(
        { error: "Nome, telefone e email sao obrigatorios" },
        { status: 400 }
      );
    }

    // Validate LGPD consent
    if (!body.lgpd_consent) {
      return NextResponse.json(
        { error: "Aceite dos termos LGPD e obrigatorio" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    // Validate phone format (10-11 digits)
    const phoneDigits = body.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return NextResponse.json(
        { error: "Telefone invalido. Use DDD + numero" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert new lead (duplicates allowed — same person can register multiple times)
    const { data: newLead, error } = await supabase
      .from("leads")
      .insert({
        name: body.name.trim(),
        phone: phoneDigits,
        email: body.email.toLowerCase().trim(),
        franchise_interest: body.franchise_interest || false,
        lgpd_consent: body.lgpd_consent,
        origin: body.origin || "qr_code",
      })
      .select("id, name, email, phone, created_at")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Erro ao cadastrar. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Cadastro realizado com sucesso!",
      lead: {
        id: newLead.id,
        name: newLead.name,
        email: newLead.email,
        phone: newLead.phone,
        created_at: newLead.created_at,
      },
      existing: false,
    });
  } catch {
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
