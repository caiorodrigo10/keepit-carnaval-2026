import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            {/* 404 Icon */}
            <div className="w-20 h-20 rounded-full bg-keepit-brand/10 flex items-center justify-center mb-4">
              <Search className="w-10 h-10 text-keepit-brand" />
            </div>

            {/* Title */}
            <h1 className="text-6xl font-black text-keepit-brand mb-2">404</h1>

            <h2 className="text-xl font-semibold text-foreground mb-2">
              Pagina nao encontrada
            </h2>

            <p className="text-muted-foreground mb-6">
              A pagina que voce esta procurando nao existe ou foi movida.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button asChild className="flex-1 bg-keepit-dark text-white hover:bg-black">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Pagina Inicial
                </Link>
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/hub">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Hub
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
