import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { logoutAction } from "@/lib/auth/actions";
import { getModerationStats } from "@/lib/moderation/actions";
import { ModerationQueue } from "@/components/moderation";
import { LogOut, History, AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import Link from "next/link";

export const metadata = {
  title: "Moderacao | Keepit Carnaval",
  description: "Central de moderacao de fotos do Keepit Carnaval 2026",
};

export const dynamic = "force-dynamic";

async function getSLAViolations() {
  const supabase = await createClient();
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lt("created_at", fiveMinutesAgo);
  return count || 0;
}

export default async function ModeracaoPage() {
  let session;
  try {
    session = await requireAuth(["admin", "moderator"]);
  } catch {
    redirect("/admin/login");
  }

  // Fetch initial pending photos
  const supabase = await createClient();
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  // Fetch initial stats
  const stats = await getModerationStats();
  const slaViolations = await getSLAViolations();

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Moderacao</span>
              <span className="block text-xs text-muted-foreground">Keepit Carnaval 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/moderacao/historico">
              <Button variant="outline" size="sm">
                <History className="h-4 w-4 mr-2" />
                Historico
                {slaViolations > 0 && (
                  <Badge className="ml-2 bg-yellow-500 text-white hover:bg-yellow-500">
                    {slaViolations}
                  </Badge>
                )}
              </Button>
            </Link>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-foreground">{session.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{session.role}</p>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* SLA Alert */}
        {slaViolations > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3 mb-6">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">
                Alerta de SLA: {slaViolations}{" "}
                {slaViolations === 1 ? "foto" : "fotos"} pendente
                {slaViolations === 1 ? "" : "s"} ha mais de 5 minutos
              </p>
              <p className="text-sm text-yellow-700">
                Priorize a moderacao para manter o SLA de 5 minutos.
              </p>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Central de Moderacao</h1>
          <p className="text-muted-foreground mt-1">
            Aprove ou rejeite as fotos enviadas pelos participantes. SLA: menos de 5 minutos.
          </p>
        </div>

        <ModerationQueue
          initialPhotos={photos ?? []}
          initialStats={stats}
        />
      </main>
    </div>
  );
}
