import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, userId, userName, userEmail } = await req.json();

    if (!message || !userId) {
      return new Response(JSON.stringify({ error: "Mensagem e ID do usuário são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Salvar no Banco de Dados
    const { data: dbMsg, error: dbError } = await supabaseClient
      .from("chat_messages")
      .insert({
        user_id: userId,
        sender_type: "client",
        content: message,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Enviar para o Telegram do Admin
    const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

    if (TELEGRAM_TOKEN && ADMIN_CHAT_ID) {
      const caption = `<b>Novo Contato: ${userName || "Cliente"}</b>\n` +
                      `✉️ ${userEmail || "Sem e-mail"}\n\n` +
                      `${message}\n\n` +
                      `<code>ID: ${userId}</code>`;

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
      const tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: caption,
          parse_mode: "HTML",
        }),
      });

      const tgData = await tgRes.json();
      if (tgData.ok) {
        // Atualizar com o ID do Telegram para referência futura
        await supabaseClient
          .from("chat_messages")
          .update({ telegram_message_id: tgData.result.message_id.toString() })
          .eq("id", dbMsg.id);
      }
    }

    return new Response(JSON.stringify({ success: true, messageId: dbMsg.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("chat-human error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
