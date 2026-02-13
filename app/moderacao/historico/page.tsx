import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { ArrowLeft, LogOut, History } from "lucide-react";
import Link from "next/link";
import { ModerationHistoryContent } from "./content";

export const metadata = {
  title: "Historico de Moderacao | Keepit Carnaval",
  description: "Historico e metricas de moderacao de fotos do Keepit Carnaval 2026",
};

async function getModerationMetrics() {
  const supabase = await createClient();

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();

  // Get total approved
  const { count: totalApproved } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "approved");

  // Get total rejected
  const { count: totalRejected } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "rejected");

  // Get total blocked
  const { count: totalBlocked } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "blocked");

  // Get today's actions
  const { count: todayApproved } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "approved")
    .gte("created_at", todayStart);

  const { count: todayRejected } = await supabase
    .from("moderation_log")
    .select("*", { count: "exact", head: true })
    .eq("action", "rejected")
    .gte("created_at", todayStart);

  // Get pending photos count for SLA check
  const { count: pendingCount } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  // Get photos pending for more than 5 minutes (SLA violation)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: slaViolations } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending")
    .lt("created_at", fiveMinutesAgo);

  // Calculate average moderation time
  // We need to join moderation_log with photos and calculate the difference
  const { data: moderationTimes } = await supabase
    .from("moderation_log")
    .select(`
      created_at,
      photo:photos!moderation_log_photo_id_fkey(created_at)
    `)
    .not("photo", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);

  let avgModerationTime = 0;
  if (moderationTimes && moderationTimes.length > 0) {
    const validTimes = moderationTimes.filter(
      (log) => log.photo && typeof log.photo === 'object' && 'created_at' in log.photo
    );

    if (validTimes.length > 0) {
      const totalTime = validTimes.reduce((acc, log) => {
        const photo = log.photo as { created_at: string };
        const photoCreated = new Date(photo.created_at).getTime();
        const moderated = new Date(log.created_at).getTime();
        return acc + (moderated - photoCreated);
      }, 0);
      avgModerationTime = Math.round(totalTime / validTimes.length / 1000); // in seconds
    }
  }

  // Calculate rejection rate
  const total = (totalApproved || 0) + (totalRejected || 0);
  const rejectionRate = total > 0 ? ((totalRejected || 0) / total) * 100 : 0;

  return {
    totalApproved: totalApproved || 0,
    totalRejected: totalRejected || 0,
    totalBlocked: totalBlocked || 0,
    todayApproved: todayApproved || 0,
    todayRejected: todayRejected || 0,
    pendingCount: pendingCount || 0,
    slaViolations: slaViolations || 0,
    avgModerationTime,
    rejectionRate: rejectionRate.toFixed(1),
  };
}

async function getModerators() {
  const supabase = await createClient();

  const { data: moderators } = await supabase
    .from("admin_users")
    .select("id, name")
    .in("role", ["admin", "moderator"])
    .order("name");

  return moderators || [];
}

export default async function ModeracaoHistoricoPage() {
  let session;
  try {
    session = await requireAuth(["admin", "moderator"]);
  } catch {
    redirect("/admin/login");
  }

  const [metrics, moderators] = await Promise.all([
    getModerationMetrics(),
    getModerators(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/moderacao">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="h-10 w-10 rounded-lg bg-keepit-brand flex items-center justify-center">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-foreground">Historico de Moderacao</span>
              <span className="block text-xs text-muted-foreground">Keepit Carnaval 2026</span>
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
        <ModerationHistoryContent
          metrics={metrics}
          moderators={moderators}
        />
      </main>
    </div>
  );
}
