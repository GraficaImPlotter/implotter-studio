import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const fromBase64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const toBase64 = (value: Uint8Array) => btoa(String.fromCharCode(...value));

async function key() {
  const value = Deno.env.get("PAYMENT_CONFIG_ENCRYPTION_KEY");
  if (!value) throw new Error("PAYMENT_CONFIG_ENCRYPTION_KEY não configurada");
  return crypto.subtle.importKey("raw", fromBase64(value), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), encoder.encode(value));
  return { ciphertext: toBase64(new Uint8Array(encrypted)), iv: toBase64(iv) };
}
export async function decrypt(ciphertext?: string | null, iv?: string | null) {
  if (!ciphertext || !iv) return null;
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, await key(), fromBase64(ciphertext));
  return decoder.decode(plain);
}
export function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
}
export async function requireAdmin(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("Não autorizado");
  const db = adminClient();
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) throw new Error("Não autorizado");
  const { data } = await db.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores");
  return { db, user };
}
export async function providerConfig(db = adminClient()) {
  const { data } = await db.from("payment_settings").select("*").eq("id", true).maybeSingle();
  const apiKey = await decrypt(data?.api_key_ciphertext, data?.api_key_iv) || Deno.env.get("ASAAS_API_KEY");
  const webhookToken = await decrypt(data?.webhook_token_ciphertext, data?.webhook_token_iv) || Deno.env.get("ASAAS_WEBHOOK_TOKEN");
  return { apiKey, webhookToken, apiUrl: data?.environment === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3", pixEnabled: data?.pix_enabled ?? true, cardEnabled: data?.card_enabled ?? true };
}