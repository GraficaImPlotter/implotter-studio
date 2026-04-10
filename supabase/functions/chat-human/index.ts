import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { message, userId, userName, userEmail, fileUrl, fileType } = await req.json();

    if (!message && !fileUrl) {
      return new Response(JSON.stringify({ error: "Mensagem ou Arquivo são obrigatórios." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "ID do usuário é obrigatório." }), {
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
        content: message || (fileType?.includes("image") ? "📷 Foto" : "📄 Arquivo"),
        file_url: fileUrl,
        file_type: fileType,
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // 2. Enviar para o Telegram do Admin
    const TELEGRAM_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const ADMIN_CHAT_ID = Deno.env.get("TELEGRAM_ADMIN_CHAT_ID");

    console.log("Tentando enviar para Telegram...");
    
    if (TELEGRAM_TOKEN && ADMIN_CHAT_ID) {
      const caption = `<b>Novo Contato: ${userName || "Cliente"}</b>\n` +
                      `✉️ ${userEmail || "Sem e-mail"}\n\n` +
                      `${message || ""}\n\n` +
                      `<code>ID: ${userId}</code>`;

      let tgMethod = "sendMessage";
      let tgBody: any = {
        chat_id: ADMIN_CHAT_ID,
        parse_mode: "HTML",
      };

      if (fileUrl) {
        if (fileType?.includes("image")) {
          tgMethod = "sendPhoto";
          tgBody.photo = fileUrl;
          tgBody.caption = caption;
        } else {
          tgMethod = "sendDocument";
          tgBody.document = fileUrl;
          tgBody.caption = caption;
        }
      } else {
        tgBody.text = caption;
      }

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${tgMethod}`;
      const tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgBody),
      });

      const tgData = await tgRes.json();
      console.log("Resposta do Telegram:", JSON.stringify(tgData));

      if (tgData.ok) {
        await supabaseClient
          .from("chat_messages")
          .update({ telegram_message_id: tgData.result.message_id.toString() })
          .eq("id", dbMsg.id);
      } else {
        console.error("Erro reportado pelo Telegram:", tgData.description);
      }
    } else {
      console.warn("TELEGRAM_BOT_TOKEN ou TELEGRAM_ADMIN_CHAT_ID não configurados.");
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
