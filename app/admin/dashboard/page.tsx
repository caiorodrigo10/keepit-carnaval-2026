import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { requireAuth } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { DashboardContent } from "@/components/dashboard";
import {
  getDashboardStats,
  getLeadsByOrigin,
  getTimelineData,
} from "@/lib/dashboard";
import { Camera, Users, Monitor, BarChart3, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata = {
  title: "Dashboard",
  description: "Painel de controle do Keepit Carnaval 2026",
};

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string }>;
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-6 w-24" />
      </div>
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

async function DashboardData({ startDate, endDate }: { startDate?: string; endDate?: string }) {
  const [stats, leadsByOrigin, timeline] = await Promise.all([
    getDashboardStats(startDate, endDate),
    getLeadsByOrigin(startDate, endDate),
    getTimelineData(startDate, endDate),
  ]);

  return (
    <DashboardContent
      initialStats={stats}
      initialLeadsByOrigin={leadsByOrigin}
      initialTimeline={timeline}
      startDate={startDate}
      endDate={endDate}
    />
  );
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  let session;
  try {
    session = await requireAuth(["admin"]);
  } catch {
    redirect("/admin/login");
  }

  const params = await searchParams;
  const startDate = params.start;
  const endDate = params.end;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Keepit Admin</span>
              <span className="block text-xs text-muted-foreground">Carnaval 2026</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
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
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardData startDate={startDate} endDate={endDate} />
        </Suspense>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Acoes Rapidas</CardTitle>
            <CardDescription>
              Acesse as principais funcoes do sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                <a href="/moderacao">
                  <Camera className="h-6 w-6" />
                  <span>Moderacao</span>
                </a>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                <a href="/admin/leads">
                  <Users className="h-6 w-6" />
                  <span>Leads</span>
                </a>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" asChild>
                <Link href="/telao/controle">
                  <Monitor className="h-6 w-6" />
                  <span>Telas</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" disabled>
                <BarChart3 className="h-6 w-6" />
                <span>Relatorios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
