/**
 * Shared CORS headers for Supabase Edge Functions.
 * Restricts allowed origins to the production domain and localhost for dev.
 */
export const ALLOWED_ORIGINS = [
  "https://graficaimplotter.shop",
  "https://www.graficaimplotter.shop",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:8080",
];

export const getCorsHeaders = (origin?: string | null): Record<string, string> => {
  const resolvedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": resolvedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

/**
 * Standard CORS preflight handler for Edge Functions.
 */
export const handleCors = (req: Request): Response | null => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }
  return null;
};
