"use client";

import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="bg-card border-border m-4">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>

              <h3 className="text-lg font-semibold text-foreground mb-1">
                Erro ao carregar componente
              </h3>

              <p className="text-sm text-muted-foreground mb-4">
                Ocorreu um erro ao carregar esta secao. Tente recarregar.
              </p>

              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Minimal inline error fallback for smaller components
export function InlineErrorFallback({
  message = "Erro ao carregar",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
      <span className="text-sm text-destructive flex-1">{message}</span>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}
