/**
 * Serviço de monitoramento de erros
 *
 * Integrado com Sentry para produção.
 * Para desenvolvimento, apenas log no console.
 */

import * as Sentry from "@sentry/react";

interface ErrorInfo {
  message: string;
  stack?: string;
  componentStack?: string;
  userId?: string;
  url: string;
  timestamp: string;
  userAgent: string;
}

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

// Inicializa Sentry se houver DSN configurado
if (isProduction && sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Envia erro para serviço de monitoramento
 * Em produção: envia para Sentry
 * Em desenvolvimento: apenas log no console
 */
export const trackError = (error: Error, errorInfo?: React.ErrorInfo) => {
  const errorData: ErrorInfo = {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
  };

  if (isDevelopment) {
    console.error("[Error Tracking]", errorData);
    return;
  }

  // Envia para Sentry
  if (sentryDsn) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo?.componentStack } },
    });
  }

  // Fallback: envia para endpoint próprio
  if (import.meta.env.VITE_ERROR_API_URL) {
    fetch(import.meta.env.VITE_ERROR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(errorData),
    }).catch(() => {
      // Silencia erros de rede no reporte de erro
    });
  }
};

/**
 * Define o usuário atual para o serviço de monitoramento
 */
export const setErrorUser = (userId: string | null, email?: string) => {
  if (isDevelopment) {
    console.log("[Error Tracking] Set user:", userId);
    return;
  }

  // Atualiza usuário no Sentry
  if (sentryDsn) {
    Sentry.setUser(userId ? { id: userId, email } : null);
  }
};

/**
 * Rastreia evento personalizado
 */
export const trackEvent = (eventName: string, properties?: Record<string, any>) => {
  if (isDevelopment) {
    console.log("[Event Tracking]", eventName, properties);
    return;
  }

  if (sentryDsn) {
    Sentry.captureMessage(eventName, {
      level: "info" as const,
      extra: properties,
    });
  }
};
