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

    // Check if email or phone already exists
    const { data: existingLead } = await supabase
      .from("leads")
      .select("id, name, email, phone, created_at")
      .or(`email.eq.${body.email.toLowerCase().trim()},phone.eq.${phoneDigits}`)
      .single();

    if (existingLead) {
      // Return existing lead info for localStorage
      return NextResponse.json({
        success: true,
        message: "Voce ja esta cadastrado!",
        lead: {
          id: existingLead.id,
          name: existingLead.name,
          email: existingLead.email,
          phone: existingLead.phone,
          created_at: existingLead.created_at,
        },
        existing: true,
      });
    }

    // Insert new lead
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
      // Handle unique constraint violation
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Email ou telefone ja cadastrado" },
          { status: 409 }
        );
      }

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
