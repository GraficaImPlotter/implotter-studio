import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Telegram doesn't use CORS for webhooks, but good to keep
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { message } = body;

    // Só processamos respostas a mensagens do bot
    if (!message || !message.reply_to_message || !message.text) {
      return new Response("OK", { status: 200 });
    }

    const replyToMsg = message.reply_to_message;
    const adminResponse = message.text;

    // Extrair UserID da legenda da mensagem original (formato ID: uuid)
    const userIdMatch = replyToMsg.text?.match(/ID: ([a-z0-9-]+)/i);
    const userId = userIdMatch ? userIdMatch[1] : null;

    if (!userId) {
      console.warn("UserID não encontrado na mensagem original.");
      return new Response("OK", { status: 200 });
    }

    // Salvar resposta do Admin no Banco
    const { error } = await supabaseClient
      .from("chat_messages")
      .insert({
        user_id: userId,
        sender_type: "admin",
        content: adminResponse
      });

    if (error) throw error;

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("telegram-webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Sempre responder 200 pro Telegram não tentar de novo em loop
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
