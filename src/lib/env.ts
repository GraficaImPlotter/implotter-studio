import { z } from "zod";

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  VITE_SUPABASE_PROJECT_ID: z.string().min(1),
  VITE_CHAT_API_URL: z.string().url().optional(),
  VITE_SENTRY_DSN: z.string().url().optional(),
});

const parseResult = envSchema.safeParse(import.meta.env);

if (!parseResult.success) {
  const issues = parseResult.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n  ");

  if (import.meta.env.DEV) {
    console.warn(
      `⚠️ Invalid environment variables:\n  ${issues}\n\n` +
      "Check your .env file. Using fallback values for development."
    );
  } else {
    console.error(
      `❌ Invalid environment variables:\n  ${issues}\n\n` +
      "Check your deployment environment variables."
    );
  }
}

export const env = parseResult.success ? parseResult.data : {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || "",
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
  VITE_SUPABASE_PROJECT_ID: import.meta.env.VITE_SUPABASE_PROJECT_ID || "",
  VITE_CHAT_API_URL: import.meta.env.VITE_CHAT_API_URL || undefined,
  VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || undefined,
};
