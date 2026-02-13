import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Login | Admin Keepit Carnaval",
  description: "Acesse o painel administrativo do Keepit Carnaval 2026",
};

export default async function AdminLoginPage() {
  // If already authenticated, redirect to dashboard
  const session = await getAdminSession();
  if (session) {
    const redirectPath =
      session.role === "admin"
        ? "/admin/dashboard"
        : session.role === "moderator"
          ? "/moderacao"
          : "/fotografo";
    redirect(redirectPath);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-keepit-brand flex items-center justify-center">
              <span className="text-white font-bold text-2xl">K</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-foreground">Keepit</span>
              <span className="block text-sm text-muted-foreground">Carnaval 2026</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <Card className="border-border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Acesso Administrativo</CardTitle>
            <CardDescription>
              Entre com suas credenciais para acessar o painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          Problemas para acessar?{" "}
          <a href="mailto:suporte@keepit.com.br" className="text-keepit-brand hover:underline">
            Entre em contato
          </a>
        </p>
      </div>
    </div>
  );
}
