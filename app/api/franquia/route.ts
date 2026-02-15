import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

interface FranchiseBody {
  name: string;
  email: string;
  phone: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FranchiseBody;

    if (!body.name || body.name.trim().length < 3) {
      return NextResponse.json({ error: "Nome deve ter pelo menos 3 caracteres" }, { status: 400 });
    }
    if (!body.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }
    const cleanPhone = (body.phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { error } = await supabase
      .from("franchise_leads")
      .insert({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: cleanPhone,
      });

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ success: true, already_registered: true });
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[franquia] Error:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
