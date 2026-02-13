"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="dark min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-2">
              Algo deu errado
            </h1>

            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Por favor, tente novamente ou volte para a pagina inicial.
            </p>

            {error.digest && (
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                Codigo do erro: {error.digest}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={reset}
                className="flex-1 bg-keepit-dark text-white hover:bg-black"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" />
                Pagina Inicial
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
