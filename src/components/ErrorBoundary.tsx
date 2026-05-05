import React from "react";
import { trackError, setErrorUser } from "@/services/errorTracking";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * ARQ-004: Global error boundary to catch unhandled errors in React component tree.
 * Prevents the entire app from crashing due to a single component error.
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("🚨 ErrorBoundary caught:", error, errorInfo);
    trackError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-2">
              Algo deu errado
            </h1>
            <p className="text-muted-foreground mb-6">
              Ocorreu um erro inesperado. Tente recarregar a página.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  sessionStorage.clear();
                  window.location.href = "/";
                }}
                className="w-full px-6 py-2.5 border border-border text-muted-foreground rounded-xl font-medium hover:bg-muted transition-colors text-sm"
              >
                Limpar Cache e Início
              </button>
            </div>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Detalhes do erro
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-lg text-xs overflow-auto max-h-48 text-destructive whitespace-pre-wrap">
                  {this.state.error.message}
                  {"\n"}
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
