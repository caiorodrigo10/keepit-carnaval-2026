import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { getScreensWithQueue, getGlobalScreenStats } from "@/lib/screen-control";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { LogOut, Monitor, Tv } from "lucide-react";
import { Toaster } from "sonner";
import { ScreenControlDashboard } from "./content";

export const metadata = {
  title: "Controle de Teloes | Keepit Carnaval",
  description: "Central de controle de filas dos teloes LED - Keepit Carnaval 2026",
};

export const dynamic = "force-dynamic";

export default async function TelaoControlePage() {
  let session;
  try {
    session = await requireAuth(["admin", "moderator"]);
  } catch {
    redirect("/admin/login");
  }

  // Fetch initial data
  const screens = await getScreensWithQueue();
  const stats = await getGlobalScreenStats();

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />

      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
              <Tv className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Controle de Teloes</span>
              <span className="block text-xs text-muted-foreground">Keepit Carnaval 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
              <Monitor className="h-4 w-4" />
              <span>{stats.totalScreens} teloes</span>
              <span className="text-green-500">({stats.onlineScreens} online)</span>
            </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Central de Controle</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie as filas de fotos exibidas nos teloes LED. Proporcao ideal: 70% fotografo / 30% usuario.
          </p>
        </div>

        <ScreenControlDashboard
          initialScreens={screens}
          initialStats={stats}
        />
      </main>
    </div>
  );
}
