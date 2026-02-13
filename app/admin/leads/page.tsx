import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LeadsContent } from "./content";

export const metadata = {
  title: "Leads",
  description: "Gerenciamento e exportacao de leads",
};

export default async function LeadsPage() {
  let session;
  try {
    session = await requireAuth(["admin"]);
  } catch {
    redirect("/admin/login");
  }

  // Fetch leads from database
  const supabase = await createClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Erro ao carregar leads</h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return <LeadsContent leads={leads || []} session={session} />;
}
